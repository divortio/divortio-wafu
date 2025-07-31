# WAFu - The Durable Object Web Application Firewall

WAFu is a highly configurable, multi-tenant Web Application Firewall (WAF) built entirely on the Cloudflare serverless
platform. 

WAFu leverages Workers, Durable Objects with native SQLite storage, and KV to provide a robust, scalable, and
performant security layer for your applications. 

By acting as a secure gateway for all incoming traffic, WAFu allows you
to enforce complex security policies at the edge, closer to your users, ensuring threats are mitigated before they can
ever reach your origin servers.

---

## 🚀 Core Features

* **🛡️ Multi-Tenant & Route-Based:** Protect any number of domains or subdomains, each with its own isolated set of
  firewall rules.
* **🚦 Hierarchical Rule System:** Apply high-priority **Global Rules** to all traffic, then evaluate route-specific
  rules with a secure, **default-block** policy.
* **🔬 Advanced Rule Engine:** Build granular rules based on over 50 data points, including geolocation, IP/ASN info,
  TLS fingerprints, and bot management scores.
* **🤖 Proactive Security:** Integrate with third-party **Threat Intelligence Feeds** to automatically block known
  malicious IPs and signatures.
* **🔑 Full Authentication Suite:**
    * Manage users, groups, and roles (**RBAC**).
    * Create secure authentication **Gates** with configurable JWT/Refresh Token expirations.
    * Generate secure, single-use **One-Time Links (OTP)** for passwordless access.
* **📊 Comprehensive Auditing & Analytics:**
    * A real-time **Analytics Dashboard** provides a visual overview of your security landscape.
    * An immutable **Audit Log** tracks every configuration change.
    * A **Live SQL Engine** allows for deep, custom analysis of security events.
* **⚙️ Integrated & Automated:** Manage everything through a powerful React-based UI, with background jobs for updating
  threat feeds and aggregating analytics.

---

## 🏗️ Project Structure

The project is organized into two main parts: the backend Worker logic in the `src/` directory and the frontend admin UI
in the `public/` directory.

### Backend (`src/`)

The backend is a Cloudflare Worker that uses several Durable Objects to manage state.

* `worker.js`: The main entry point for all incoming traffic. It routes requests to the appropriate Durable Object.
* `global-rules-do.js`: A singleton Durable Object that manages global configuration and rules that apply to all
  traffic.
* `route-rules-do.js`: A Durable Object class where a unique instance is created for each route you protect, holding its
  specific rules.
* `utils.js`: A shared module containing the core rule evaluation engine, used by both `global-rules-do.js`
  and `route-rules-do.js` to avoid code duplication.
* Other `*-do.js` files provide additional stateful services like authentication and logging.

### Frontend (`public/`)

The frontend is a modular, build-less React application. All files are standard JavaScript and are served as static
assets.

* `index.html`: The main HTML file that loads all the necessary scripts.
* `config.js`: Contains the default, demo configuration for a fresh deployment.
* `globals.js`: Defines global constants for React hooks (`useState`, etc.) to be shared across all UI scripts.
* `constants.js`, `fields.js`, `utils.js`: Contain static data, icons, and helper functions for the UI.
* `components.js`: Contains reusable React components (e.g., the Rule Editor modal).
* `views.js`: Contains the main "page" components (e.g., the Firewall Rules page).
* `ui.js`: The main application script that ties everything together and renders the UI.

---
## 🛠️ Deployment Instructions

This guide is broken into five phases to get you from a fresh clone to a fully secured application.

### Phase 1: Initial Setup

First, get the code and ensure your local environment is ready.

1. **Get the Code:** Clone the `cf-WAFu` repository from GitHub to your local machine:
   ```bash
   git clone [https://github.com/your-username/cf-WAFu.git](https://github.com/your-username/cf-WAFu.git)
   cd cf-WAFu
   ```

2. **Prerequisites:**
    * **A Cloudflare account:** WAFu is built on the Cloudflare ecosystem and requires an active account.
    * **Node.js and npm:** Required for running the Wrangler CLI. You can download them
      from [nodejs.org](https://nodejs.org/).
    * **Wrangler CLI:** The command-line interface for managing Cloudflare Workers. Install and authenticate it
      globally:
        ```bash
        npm install -g wrangler
        wrangler login
        ```

### Phase 2: Cloudflare Configuration

Next, we'll configure the necessary Cloudflare services that WAFu depends on.

1. **Configure `wrangler.toml`:**
    * Open the `wrangler.toml` file.
    * Add your Cloudflare `account_id`. You can find this on the right-hand sidebar of your Cloudflare dashboard
      homepage.

2. **Create KV Namespace:** This is where WAFu will store threat intelligence feeds.
   ```bash
   wrangler kv:namespace create WAFU_LOOKUP_TABLES
   ```
   Wrangler will output an `id`. Copy this ID and paste it into the corresponding `id` field in your `wrangler.toml`.

3. **Set Up Secrets:** The UI's API is protected by a secret key.
    * Generate a strong, random secret key (e.g., `openssl rand -base64 32`).
    * Set the secret using the Wrangler CLI. This securely stores the secret with Cloudflare, not in your code.
        ```bash
        wrangler secret put WAFU_CONFIG_SECRET
        ```
      Wrangler will prompt you to enter the secret value you generated.

> **💡 Example `wrangler.toml` Configuration**
> Your `wrangler.toml` file should look similar to this after configuration.
> ```toml
> name = "wafu"
> main = "src/worker.js"
> compatibility_date = "2023-10-30"
> account_id = "YOUR_CLOUDFLARE_ACCOUNT_ID"
> 
> [placement]
> mode = "smart"
> 
> [durable_objects]
> bindings = [
>   { name = "WAFU_GLOBAL_DO", class_name = "GlobalRulesDO" },
>   { name = "WAFU_ROUTE_DO", class_name = "RouteRulesDO" },
>   { name = "WAFU_OTP_DO", class_name = "OtpDO" },
>   { name = "WAFU_EVENT_LOGS_DO", class_name = "EventLogsDO" },
>   { name = "WAFU_AUDIT_LOGS_DO", class_name = "AuditLogsDO" }
> ]
> 
> [[kv_namespaces]]
> binding = "WAFU_LOOKUP_TABLES"
> id = "YOUR_KV_NAMESPACE_ID_FROM_STEP_3"
> 
> [[services]]
> binding = "SELF"
> service = "wafu"
> 
> [[services]]
> binding = "MY_API_WORKER"
> service = "my-api-worker"
> 
> [triggers]
> crons = ["*/15 * * * *"]
> 
> [[site]]
> bucket = "./public"
> ```

### Phase 3: Deploy WAFu

You can deploy WAFu manually from the command line, automatically with GitHub Actions, or directly from the Cloudflare
UI.

#### Method A: Manual Deployment (CLI)

This is the simplest way to get started. Run the following command in your project's root directory:

```bash
wrangler deploy
```

Wrangler will deploy your worker and all associated resources. It will output a `*.workers.dev` URL (
e.g., `wafu.my-account.workers.dev`). Proceed to **Phase 4**.

#### Method B: Automated Deployment (GitHub Actions)

For a production workflow, we recommend automated deployments.

1. **Create GitHub Secrets:** In your GitHub repository, go to `Settings` > `Secrets and variables` > `Actions`. Create
   the following repository secrets:
    * `CLOUDFLARE_API_TOKEN`: Generate an API token from your Cloudflare profile page with "Workers Scripts: Edit"
      permissions.
    * `CLOUDFLARE_ACCOUNT_ID`: Your account ID from Step 3.
    * `WAFU_CONFIG_SECRET`: The secret key you generated in Step 4.
2. **Create Workflow File:** Create a file at `.github/workflows/deploy.yml` and paste the following content:
   ```yml
   name: Deploy WAFu Worker
   on:
     push:
       branches: [ main ]
   jobs:
     deploy:
       runs-on: ubuntu-latest
       name: Deploy
       steps:
         - uses: actions/checkout@v3
         - name: Install Node.js
           uses: actions/setup-node@v3
           with:
             node-version: '18'
         - name: Install Wrangler
           run: npm install -g wrangler
         - name: Set WAFu Secret
           run: echo "WAFU_CONFIG_SECRET=${{ secrets.WAFU_CONFIG_SECRET }}" | wrangler secret put
           env:
             CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
             CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
         - name: Deploy
           run: wrangler deploy
           env:
             CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
             CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
   ```
3. **Commit and Push:** Commit and push this new file to your `main` branch. GitHub Actions will now automatically
   deploy WAFu whenever you push changes.

#### Method C: Deployment from the Cloudflare UI

This method is ideal for users who prefer a graphical interface.

1. **Fork the Repository:** Fork the `cf-WAFu` repository to your own GitHub account.
2. **Navigate to Workers & Pages:** In the Cloudflare dashboard, go to `Workers & Pages`.
3. **Create Application:** Click "Create application", then select the "Workers" tab.
4. **Connect to Git:** Click "Connect with Git" and select the `cf-WAFu` repository you forked.
5. **Configure Deployment:**
    * **Project Name:** Give your WAFu instance a name (e.g., `wafu-prod`).
    * **Production Branch:** Ensure this is set to `main`.
    * Click "Save and Deploy".
6. **Configure Bindings and Secrets:** The initial deployment will fail because it's missing bindings.
    * Go to your new Worker's `Settings` tab > `Variables`.
    * Under **Durable Object Bindings**, click "Add binding" for each of the 5 DOs from `wrangler.toml`.
    * Under **KV Namespace Bindings**, add your `WAFU_LOOKUP_TABLES` binding.
    * Under **Service Bindings**, add the `SELF` binding and any origin worker bindings.
    * Under **Environment Variables**, add the `WAFU_CONFIG_SECRET` and its value, making sure to **Encrypt** it.
7. **Trigger a New Deployment:** Go to the "Deployments" tab and click "Deploy".

### Phase 4: Point Your DNS to WAFu

This final step routes your live traffic through the WAFu worker. For each hostname you configured in the WAFu **
Routes** UI, you must create a corresponding DNS record in Cloudflare.

#### Example 1: Single Subdomain

* **WAFu Route Config:** `www.mydomain.com`
* **Cloudflare DNS Record:**
    * **Type:** `CNAME`
    * **Name:** `www`
    * **Target:** `wafu.my-account.workers.dev`
    * **Proxy:** Must be **Proxied** (orange cloud).

#### Example 2: Multiple Subdomains

* **WAFu Route Configs:** `app.mydomain.com`, `api.mydomain.com`
* **Cloudflare DNS Records:** You need two separate records.
    1. **Type:** `CNAME`, **Name:** `app`, **Target:** `wafu.my-account.workers.dev`, **Proxy:** Proxied
    2. **Type:** `CNAME`, **Name:** `api`, **Target:** `wafu.my-account.workers.dev`, **Proxy:** Proxied

#### Example 3: Wildcard Domain

* **WAFu Route Config:** `*.customers.mydomain.com`
* **Cloudflare DNS Record:**
    * **Type:** `CNAME`
    * **Name:** `*` (or `*.customers` if you are on an Enterprise plan)
    * **Target:** `wafu.my-account.workers.dev`
    * **Proxy:** Must be **Proxied** (orange cloud).

### Phase 5: Securing Your Origins

After routing your public DNS through WAFu, your final step is to lock down your origin applications so they can *only*
be accessed by WAFu. This prevents attackers from bypassing your firewall.

#### For Cloudflare Pages & Public Origins: Authenticated Origin Pulls (mTLS)

This method uses client certificates to ensure your origin only accepts traffic from your Cloudflare account.

1. In the Cloudflare dashboard for your **origin's zone**, navigate to `SSL/TLS` > `Origin Server`.
2. Scroll down to **Authenticated Origin Pulls** and toggle it **On**.

Cloudflare will now automatically attach a client certificate to requests from WAFu to your origin. Your Pages site will
automatically validate this certificate and reject any connection without it.

#### For Cloudflare Worker Origins: Service Bindings

This is the most secure and performant method for worker-to-worker communication.

1. **Ensure your origin worker has no public route.** In its `wrangler.toml`, there should be no `triggers` section with
   a `route` or `routes`.
2. **Bind the service in WAFu's `wrangler.toml`:** As shown in the example, add a `[[services]]` binding with the name
   of your origin worker.
3. **Configure the Route in WAFu UI:** In the WAFu "Routes" page, set the "Origin Type" to "Private Worker (Service
   Binding)" and enter the binding name (e.g., `MY_API_WORKER`).

Your origin worker is now completely inaccessible from the public internet and can only be invoked by your WAFu worker.

# Managing WAFu: The Admin UI

Once WAFu is deployed, all configuration and management is handled through the built-in web admin UI.

### 1. Accessing the Admin Dashboard

The admin UI is served directly from your WAFu worker. To access it, simply navigate to the `/wafu-admin/` path on any
domain that is routed through your WAFu worker.

* **URL Format:** `https://[your-domain.com]/wafu-admin/`
* **Example:** If your domain is `www.example.com`, you would access the admin UI
  at `https://www.example.com/wafu-admin/`.

You will be prompted to log in.

### 2. Logging In

Access to the entire admin dashboard is protected by a single, powerful password: the **`WAFU_CONFIG_SECRET`** you
configured during deployment.

* Enter this secret value into the login prompt to gain access.

> **⚠️ Important:** The `WAFU_CONFIG_SECRET` is the master key to your firewall. Anyone who has this key can modify all security rules and settings. Please store it securely.

### 3. Using the Dashboard: Key Features

The admin UI is a comprehensive React-based single-page application that gives you full control over your firewall. Key
sections include:

* **Dashboard:** A real-time overview of security events, showing blocked vs. allowed requests, top threats, and traffic
  patterns.
* **Routes:** Configure which hostnames WAFu should protect. For each route, you can specify its origin (public address
  or private service binding) and link it to a set of rules.
* **Global Rules:** Define high-priority firewall rules that apply to *all* traffic passing through WAFu, regardless of
  the route.
* **Route Rules:** Create granular firewall rules that apply only to a specific route. This is where you'll define most
  of your application-specific logic.
* **Threat Intelligence:** Manage and view the status of third-party threat feeds. WAFu automatically updates these
  lists in the background.
* **Authentication:**
    * **Gates:** Protect specific paths with authentication, requiring users to log in before they can access the
      underlying page.
    * **Users & Groups:** Manage users and group memberships for role-based access control (RBAC).
    * **One-Time Links (OTP):** Generate secure, single-use login links for passwordless authentication.
* **Live SQL & Logs:**
    * **Event Log:** A searchable log of every request processed by WAFu.
    * **Live SQL:** A powerful query engine that lets you run complex SQL queries directly against the event logs stored
      in SQLite for deep analysis.
    * **Audit Log:** An immutable log that records every configuration change made through the UI, providing a clear
      trail of who changed what, and when.