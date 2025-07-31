/*
 * =============================================================================
 * FILE: public/constants.js
 *
 * DESCRIPTION:
 * Contains shared constants for the WAFu frontend, primarily the SVG icon
 * definitions used by various components.
 * =============================================================================
 */

const ICONS = {
    shield: React.createElement('svg', {
        xmlns: "http://www.w3.org/2000/svg",
        width: "20",
        height: "20",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round"
    }, React.createElement('path', {d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"})),
    route: React.createElement('svg', {
        xmlns: "http://www.w3.org/2000/svg",
        width: "20",
        height: "20",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round"
    }, React.createElement('path', {d: "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"}), React.createElement('line', {
        x1: "4",
        y1: "22",
        x2: "4",
        y2: "15"
    })),
    book: React.createElement('svg', {
        xmlns: "http://www.w3.org/2000/svg",
        width: "20",
        height: "20",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round"
    }, React.createElement('path', {d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20"}), React.createElement('path', {d: "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"})),
    globe: React.createElement('svg', {
        xmlns: "http://www.w3.org/2000/svg",
        width: "20",
        height: "20",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round"
    }, React.createElement('circle', {cx: "12", cy: "12", r: "10"}), React.createElement('line', {
        x1: "2",
        y1: "12",
        x2: "22",
        y2: "12"
    }), React.createElement('path', {d: "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"})),
    tag: React.createElement('svg', {
        xmlns: "http://www.w3.org/2000/svg",
        width: "20",
        height: "20",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round"
    }, React.createElement('path', {d: "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"}), React.createElement('line', {
        x1: "7",
        y1: "7",
        x2: "7.01",
        y2: "7"
    })),
    users: React.createElement('svg', {
        xmlns: "http://www.w3.org/2000/svg",
        width: "20",
        height: "20",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round"
    }, React.createElement('path', {d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"}), React.createElement('circle', {
        cx: "9",
        cy: "7",
        r: "4"
    }), React.createElement('path', {d: "M23 21v-2a4 4 0 0 0-3-3.87"}), React.createElement('path', {d: "M16 3.13a4 4 0 0 1 0 7.75"})),
    edit: React.createElement('svg', {
        xmlns: "http://www.w3.org/2000/svg",
        width: "16",
        height: "16",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round"
    }, React.createElement('path', {d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"}), React.createElement('path', {d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"})),
    trash: React.createElement('svg', {
        xmlns: "http://www.w3.org/2000/svg",
        width: "16",
        height: "16",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round"
    }, React.createElement('polyline', {points: "3 6 5 6 21 6"}), React.createElement('path', {d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"}), React.createElement('line', {
        x1: "10",
        y1: "11",
        x2: "10",
        y2: "17"
    }), React.createElement('line', {x1: "14", y1: "11", x2: "14", y2: "17"})),
    plus: React.createElement('svg', {
        xmlns: "http://www.w3.org/2000/svg",
        width: "16",
        height: "16",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round"
    }, React.createElement('line', {x1: "12", y1: "5", x2: "12", y2: "19"}), React.createElement('line', {
        x1: "5",
        y1: "12",
        x2: "19",
        y2: "12"
    })),
    info: React.createElement('svg', {
        xmlns: "http://www.w3.org/2000/svg",
        width: "16",
        height: "16",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round"
    }, React.createElement('circle', {cx: "12", cy: "12", r: "10"}), React.createElement('line', {
        x1: "12",
        y1: "16",
        x2: "12",
        y2: "12"
    }), React.createElement('line', {x1: "12", y1: "8", x2: "12.01", y2: "8"})),
    check: React.createElement('svg', {
        xmlns: "http://www.w3.org/2000/svg",
        width: "20",
        height: "20",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round"
    }, React.createElement('path', {d: "M22 11.08V12a10 10 0 1 1-5.93-9.14"}), React.createElement('polyline', {points: "22 4 12 14.01 9 11.01"})),
    arrowUp: React.createElement('svg', {
        xmlns: "http://www.w3.org/2000/svg",
        width: "16",
        height: "16",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round"
    }, React.createElement('line', {
        x1: "12",
        y1: "19",
        x2: "12",
        y2: "5"
    }), React.createElement('polyline', {points: "5 12 12 5 19 12"})),
    arrowDown: React.createElement('svg', {
        xmlns: "http://www.w3.org/2000/svg",
        width: "16",
        height: "16",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round"
    }, React.createElement('line', {
        x1: "12",
        y1: "5",
        x2: "12",
        y2: "19"
    }), React.createElement('polyline', {points: "19 12 12 19 5 12"})),
};
