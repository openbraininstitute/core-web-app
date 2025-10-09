/* eslint-disable react/jsx-props-no-spreading */

export function HelpIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" {...props}>
      <path
        fill="currentColor"
        d="M10 7a3 3 0 1 0-6 0 3 3 0 0 0 6 0Zm1 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
      />
      <path
        fill="currentColor"
        d="M13 7A6 6 0 1 0 1 7a6 6 0 0 0 12 0Zm1 0A7 7 0 1 1 0 7a7 7 0 0 1 14 0Z"
      />
      <path
        fill="currentColor"
        d="M4.707 4.293 4 5 2 3l.707-.707 2 2ZM4.707 9.707 4 9l-2 2 .707.707 2-2ZM9.293 4.293 10 5l2-2-.707-.707-2 2ZM9.293 9.707 10 9l2 2-.707.707-2-2Z"
      />
    </svg>
  );
}

export function NotebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14px" height="14px" fill="none" {...props}>
      <path
        fill="currentColor"
        d="M12.5 3A1.5 1.5 0 0 0 11 1.5H5A1.5 1.5 0 0 0 3.5 3v10A1.5 1.5 0 0 0 5 14.5h6a1.5 1.5 0 0 0 1.5-1.5V3Zm1 10a2.5 2.5 0 0 1-2.5 2.5H5A2.5 2.5 0 0 1 2.5 13V3A2.5 2.5 0 0 1 5 .5h6A2.5 2.5 0 0 1 13.5 3v10Z"
      />
      <path fill="currentColor" d="M3 4v1H0V4h3ZM3 7.5v1H0v-1h3ZM3 11v1H0v-1h3ZM7 15H6V1h1v14Z" />
    </svg>
  );
}

export function ReportsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="12"
      height="15"
      viewBox="0 0 12 15"
      fill="none"
      {...props}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1.52352 0C0.687198 0 0 0.674361 0 1.49507V13.5023C0 14.323 0.687198 15 1.52352 15H10.4765C11.3128 15 12 14.323 12 13.5023V1.49507C12 0.674361 11.3128 0 10.4765 0H1.52352ZM1.52352 0.937382H10.4765C10.7996 0.937382 11.0448 1.17733 11.0448 1.49507V13.5023C11.0448 13.8194 10.8003 14.0626 10.4765 14.0626L1.52352 14.0633C1.20042 14.0633 0.955226 13.82 0.955226 13.503V1.49505C0.955226 1.17798 1.19975 0.937382 1.52352 0.937382ZM7.01031 2.46012C6.88335 2.45946 6.76176 2.5089 6.67174 2.59658C6.58172 2.68425 6.53134 2.80357 6.53067 2.92815V3.70995H4.98969C4.72705 3.71127 4.51477 3.91958 4.51343 4.17666V4.76467H2.97245C2.7098 4.76599 2.49753 4.97496 2.49686 5.23269V7.73769C2.49753 7.99477 2.71047 8.20308 2.97245 8.2044H9.02758C9.28956 8.20308 9.5025 7.99477 9.50317 7.73769V2.92818C9.5025 2.67044 9.29023 2.46147 9.02758 2.46016L7.01031 2.46012ZM7.4859 3.39882H8.54793V7.26702H7.4859V3.39882ZM5.46924 4.64734H6.5306V7.26692H5.46924V4.64734ZM3.45207 5.69942H4.5141V7.267H3.45207V5.69942ZM3.51924 9.28748C3.39228 9.28682 3.2707 9.33626 3.18067 9.42394C3.09066 9.51161 3.03961 9.63093 3.03961 9.75551C3.04028 9.87944 3.09066 9.99875 3.18067 10.0864C3.27069 10.1741 3.39228 10.2229 3.51924 10.2222H8.87911C9.14175 10.2216 9.35403 10.0126 9.3547 9.7555C9.3547 9.49777 9.14175 9.2888 8.87911 9.28748L3.51924 9.28748ZM3.51924 11.6033C3.39228 11.6026 3.2707 11.6514 3.18067 11.7391C3.09066 11.8268 3.04028 11.9454 3.03961 12.07C3.03893 12.1953 3.08931 12.3152 3.17933 12.4036C3.26934 12.4919 3.39161 12.5413 3.51924 12.5407H8.87911C9.00607 12.54 9.12698 12.4899 9.21632 12.4023C9.30566 12.3139 9.35537 12.1946 9.3547 12.07C9.35403 11.8123 9.14175 11.604 8.87911 11.6033L3.51924 11.6033Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function WorkflowIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" {...props}>
      <path
        fill="currentColor"
        d="M1.559.588c.418-.784 1.464-.784 1.882 0l1.412 2.647c.392.736-.043 1.644-.789 1.754L3.912 5V4c.007 0 .008-.001.013-.004a.147.147 0 0 0 .046-.055.25.25 0 0 0 0-.235L2.559 1.059c-.022-.04-.04-.052-.044-.054A.028.028 0 0 0 2.5 1a.028.028 0 0 0-.015.005c-.004.002-.022.013-.044.054L1.03 3.706a.25.25 0 0 0 0 .235c.018.034.038.05.046.055.005.003.006.004.013.004v1l-.152-.01C.24 4.885-.185 4.087.08 3.384l.067-.15L1.56.588ZM3.912 4v1H1.088V4h2.824ZM13 4v1h-3V4h3Zm0-3h-3v4l-.103-.005a1 1 0 0 1-.892-.892L9 4V1a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3a1 1 0 0 1-.898.995L13 5V1ZM13 11.5a1.5 1.5 0 1 0-1.5 1.5v1a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5v-1a1.5 1.5 0 0 0 1.5-1.5ZM2.875 9l2.874 2.875-2.874 2.875L0 11.875 2.875 9Zm0 4.335 1.46-1.46-1.46-1.46-1.46 1.46 1.46 1.46ZM2 6h1v2H2V6ZM8.005 1.995v1h-2v-1h2ZM11 6h1v2h-1V6Z"
      />
    </svg>
  );
}

export function Home(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      fill="none"
      viewBox="-1 -1 16 16"
      {...props}
    >
      <path
        fill="currentColor"
        d="m14.297 5.406.203.15V14.5H9.321V8.88H5.68v5.62H.5V5.556l.203-.15L7.5.378l6.797 5.028ZM1.5 6.06v7.44h3.179V7.88h5.642v5.62H13.5V6.06l-6-4.439-6 4.439Z"
      />
    </svg>
  );
}

export function ExploreIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" {...props}>
      <path fill="currentColor" d="M4.326 1.5v1H1v10h10V8.218h1V13.5H0v-12h4.326Z" />
      <path
        fill="currentColor"
        d="M12 3a2 2 0 1 0-2 2v1a3 3 0 1 1 0-6 3 3 0 0 1 0 6V5a2 2 0 0 0 2-2Z"
      />
      <path
        fill="currentColor"
        d="M13.707 6.293 13 7l-2-2 .707-.707 2 2ZM4 4v1H2V4h2ZM4 7v1H2V7h2ZM4 10v1H2v-1h2ZM9 7v1H5V7h4ZM10 10v1H5v-1h5ZM6 4v1H5V4h1Z"
      />
    </svg>
  );
}

export function CoinsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        color="currentColor"
      >
        <ellipse cx="15.5" cy="11" rx="6.5" ry="2" />
        <path d="M22 15.5c0 1.105-2.91 2-6.5 2s-6.5-.895-6.5-2" />
        <path d="M22 11v8.8c0 1.215-2.91 2.2-6.5 2.2S9 21.015 9 19.8V11" />
        <ellipse cx="8.5" cy="4" rx="6.5" ry="2" />
        <path d="M6 11c-1.892-.23-3.63-.825-4-2m4 7c-1.892-.23-3.63-.825-4-2" />
        <path d="M6 21c-1.892-.23-3.63-.826-4-2V4m13 2V4" />
      </g>
    </svg>
  );
}

export function PeopleCommunity(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20" {...props}>
      <path
        fill="currentColor"
        d="M10 2a3 3 0 1 0 0 6a3 3 0 0 0 0-6M5.053 9.996q-.051.244-.051.504V14a4.99 4.99 0 0 0 1.767 3.814l-.171.05a4 4 0 0 1-4.9-2.828l-.647-2.415a1.5 1.5 0 0 1 1.061-1.837zm8.182 7.818A4.99 4.99 0 0 0 15.002 14v-3.5q-.001-.26-.05-.504l2.94.788a1.5 1.5 0 0 1 1.06 1.837l-.647 2.415a4 4 0 0 1-5.07 2.778M16.5 4a2.5 2.5 0 1 0 0 5a2.5 2.5 0 0 0 0-5m-13 0a2.5 2.5 0 1 0 0 5a2.5 2.5 0 0 0 0-5m4 5A1.5 1.5 0 0 0 6 10.5V14a4 4 0 0 0 8 0v-3.5A1.5 1.5 0 0 0 12.5 9z"
      />
    </svg>
  );
}

export function HierarchySquare(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      {/* Icon from Huge Icons by Hugeicons - undefined */}
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        color="currentColor"
      >
        <path d="M2 20c0-.943 0-1.414.293-1.707S3.057 18 4 18h1c.943 0 1.414 0 1.707.293S7 19.057 7 20s0 1.414-.293 1.707S5.943 22 5 22H4c-.943 0-1.414 0-1.707-.293S2 20.943 2 20m15 0c0-.943 0-1.414.293-1.707S18.057 18 19 18h1c.943 0 1.414 0 1.707.293S22 19.057 22 20s0 1.414-.293 1.707S20.943 22 20 22h-1c-.943 0-1.414 0-1.707-.293S17 20.943 17 20m2.5-2.5c0-3.31-.648-4-3.75-4H14.5m-10 4c0-3.31.648-4 3.75-4H9.5M12 7v4m-2-9h4c1.815 0 2 .925 2 2.5S15.815 7 14 7h-4c-1.815 0-2-.925-2-2.5S8.185 2 10 2" />
        <path d="M14.5 13.5a2.5 2.5 0 1 1-5 0a2.5 2.5 0 0 1 5 0" />
      </g>
    </svg>
  );
}

export function CopyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" {...props}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M0 5.09c0-.401.325-.726.727-.726h10.182c.402 0 .727.325.727.727v10.182a.727.727 0 0 1-.727.727H.727A.727.727 0 0 1 0 15.273V5.091Zm1.454.728v8.728h8.728V5.818H1.454Z"
        clipRule="evenodd"
      />
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M4.364.727c0-.402.325-.727.727-.727h10.182c.402 0 .727.325.727.727v10.182a.727.727 0 0 1-.727.727h-2.182v-1.454h1.455V1.454H5.818V2.91H4.364V.727Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function BookmarkIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" {...props}>
      <path
        fill="#fff"
        d="M9.6 0H2.4C1.075 0 0 1.102 0 2.462v12.923c0 .34.268.615.6.615.332 0 .6-.275.6-.615v-.462a5.85 5.85 0 0 1 1.458-.154h6.684c.49-.01.98.042 1.458.154v.462c0 .34.268.615.6.615.332 0 .6-.275.6-.615V2.462c0-.654-.253-1.28-.703-1.741A2.37 2.37 0 0 0 9.6 0ZM5.4 8.615v2.462h-.6V9.23H3.6v1.846H3V9.23H1.8v1.846h-.6V6.769h9.6v4.308H6.6V8.615H5.4Zm-3-7.384h7.2c.318 0 .623.13.848.36.225.231.352.544.352.87v3.077h-.6V3.692H9v1.846h-.6V3.692H7.2v1.846h-.6V3.077H5.4v2.461H1.2V2.462c0-.68.537-1.231 1.2-1.231Zm6.942 12.308H2.658a7.357 7.357 0 0 0-1.458.123v-1.354h9.6v1.354c-.48-.09-.969-.131-1.458-.123Z"
      />
    </svg>
  );
}

export function DownloadIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" {...props}>
      <path
        fill="#fff"
        d="M12.53 8.315a.744.744 0 0 0 0-1.056.753.753 0 0 0-1.06 0l-3.22 3.205V.747A.749.749 0 0 0 7.5 0a.749.749 0 0 0-.75.747v9.717L3.53 7.259a.753.753 0 0 0-1.06 0 .744.744 0 0 0 0 1.056l4.5 4.48a.75.75 0 0 0 1.06 0l4.5-4.48ZM14.25 14.506c.414 0 .75.335.75.747a.749.749 0 0 1-.75.747H.75a.749.749 0 0 1-.75-.747c0-.412.336-.747.75-.747h13.5Z"
      />
    </svg>
  );
}

export function DownloadAsBoxIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <path
        fill="currentColor"
        d="M21.086 8.804v2.21a.75.75 0 1 1-1.5 0v-2.21a2 2 0 0 0-.13-.76l-7.3 4.38v8.19q.172-.051.33-.14l2.53-1.4a.75.75 0 0 1 1 .29a.75.75 0 0 1-.3 1l-2.52 1.4a3.72 3.72 0 0 1-3.62 0l-6-3.3a3.79 3.79 0 0 1-1.92-3.27v-6.39c0-.669.18-1.325.52-1.9q.086-.155.2-.29l.12-.15a3.45 3.45 0 0 1 1.08-.93l6-3.31a3.81 3.81 0 0 1 3.62 0l6 3.31c.42.231.788.548 1.08.93a1 1 0 0 1 .12.15q.113.135.2.29a3.64 3.64 0 0 1 .49 1.9"
      />
      <path
        fill="currentColor"
        d="m22.196 17.624l-2 2a1.2 1.2 0 0 1-.39.26a1.1 1.1 0 0 1-.46.1q-.239 0-.46-.09a1.3 1.3 0 0 1-.4-.27l-2-2a.74.74 0 0 1 0-1.06a.75.75 0 0 1 1.06 0l1 1v-3.36a.75.75 0 0 1 1.5 0v3.38l1-1a.75.75 0 0 1 1.079-.02a.75.75 0 0 1-.02 1.08z"
      />
    </svg>
  );
}

export function ArrowOpenRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <path strokeDasharray="20" strokeDashoffset="20" d="M3 3v18">
          <animate fill="freeze" attributeName="stroke-dashoffset" dur="0.2s" values="20;0" />
        </path>
        <path strokeDasharray="16" strokeDashoffset="16" d="M7 12h13.5">
          <animate
            fill="freeze"
            attributeName="stroke-dashoffset"
            begin="0.3s"
            dur="0.2s"
            values="16;0"
          />
        </path>
        <path strokeDasharray="12" strokeDashoffset="12" d="M21 12l-7 7M21 12l-7 -7">
          <animate
            fill="freeze"
            attributeName="stroke-dashoffset"
            begin="0.5s"
            dur="0.2s"
            values="12;0"
          />
        </path>
      </g>
    </svg>
  );
}

export function ArrowSyncFilled(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 12 12" {...props}>
      <path
        fill="currentColor"
        d="M7.423 2.925a.6.6 0 0 0 0-.849L6.173.826a.6.6 0 0 0-.849.849l.248.247a4.1 4.1 0 0 0-2.75 6.67a.6.6 0 0 0 .93-.759A2.9 2.9 0 0 1 5.51 3.141l-.186.185a.6.6 0 0 0 .849.849zm.701.23a.6.6 0 0 0-.022.85A2.9 2.9 0 0 1 6.488 8.86l.185-.185a.6.6 0 0 0-.849-.849l-1.25 1.25a.6.6 0 0 0 0 .849l1.25 1.25a.6.6 0 0 0 .849-.849l-.248-.248a4.1 4.1 0 0 0 2.547-6.9a.6.6 0 0 0-.848-.022"
      />
    </svg>
  );
}

export function LabCompany(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 20 20"
      width={props?.width || 24}
      height={props?.height || 24}
      {...props}
    >
      <path
        fill="currentColor"
        d="M3.2 14a.8.8 0 1 0 0 1.6h3.6a.8.8 0 0 0 0-1.6H3.2Zm7.6-6a.8.8 0 0 0 1.6 0V7a.8.8 0 0 0-1.6 0v1Zm3.2.8a.8.8 0 0 1-.8-.8V7a.8.8 0 0 1 1.6 0v1a.8.8 0 0 1-.8.8Zm2.4 0a.8.8 0 0 1-.8-.8V7a.8.8 0 0 1 1.6 0v1a.8.8 0 0 1-.8.8Z"
      />
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M20 4.4c0 .398-.236.758-.6.917V19a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V8.66a1 1 0 0 1 1.226-.975L8.6 9.4V5.317A1 1 0 0 1 8 4.4V1a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v3.4Zm-4.4 11.2v2.8h-5.4v-2.8h5.4Zm-6-1.6h6v-1.33l-14-3.255V18.4h7V15a1 1 0 0 1 1-1Zm7.6 4.399v-6.205a1 1 0 0 0-.774-.974L10.2 9.772V5.4h7.6v13h-.6v-.001ZM9.6 3.8V1.6h8.8v2.2H9.6Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function UserFilled(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <g fill="none">
        <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
        <path
          fill="currentColor"
          d="M12 13c2.396 0 4.575.694 6.178 1.672c.8.488 1.484 1.064 1.978 1.69c.486.615.844 1.351.844 2.138c0 .845-.411 1.511-1.003 1.986c-.56.45-1.299.748-2.084.956c-1.578.417-3.684.558-5.913.558s-4.335-.14-5.913-.558c-.785-.208-1.524-.506-2.084-.956C3.41 20.01 3 19.345 3 18.5c0-.787.358-1.523.844-2.139c.494-.625 1.177-1.2 1.978-1.69C7.425 13.695 9.605 13 12 13m0-11a5 5 0 1 1 0 10a5 5 0 0 1 0-10"
        />
      </g>
    </svg>
  );
}

export function HorizontalResize(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20V4m4 16V4m-4 8H6" />
        <path d="M2 12.05c-.03-1.035 4.008-3.47 4.389-2.987c.431.548-.6 2.177-.832 2.695c-.14.312-.136.448.023.76c.717 1.406 1.075 2.11.856 2.414l-.002.003C6.08 15.42 2.03 13.061 2 12.05Zm20-.1c.03 1.035-4.008 3.47-4.389 2.987c-.431-.548.6-2.177.832-2.695c.14-.312.136-.448-.023-.76c-.717-1.406-1.075-2.11-.856-2.414l.002-.003C17.92 8.58 21.97 10.939 22 11.95Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 12h-4" />
      </g>
    </svg>
  );
}

export function IconInjection(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 48 48" {...props}>
      {/* Icon from IconPark Outline by ByteDance - https://github.com/bytedance/IconPark/blob/master/LICENSE */}
      <g fill="none">
        <path d="M38.168 22.262L19.077 41.354L6.349 28.626L25.44 9.534" clipRule="evenodd" />
        <path
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="4"
          d="M38.168 22.262L19.077 41.354L6.349 28.626L25.44 9.534"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="4"
          d="m21.905 5.999l19.8 19.799m-26.871 2.828l4.243 4.243M6.35 41.353l6.363-6.363m19.092-19.092l3.534-3.535"
        />
      </g>
    </svg>
  );
}
