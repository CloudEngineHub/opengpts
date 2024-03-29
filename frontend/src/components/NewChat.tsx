import { Schemas } from "../hooks/useSchemas";
import TypingBox from "./TypingBox";
import { ConfigListProps } from "../hooks/useConfigList";
import { cn } from "../utils/cn";
import { MessageWithFiles } from "../utils/formTypes.ts";

interface NewChatProps extends ConfigListProps {
  configSchema: Schemas["configSchema"];
  configDefaults: Schemas["configDefaults"];
  startChat: (message: MessageWithFiles) => Promise<void>;
  isDocumentRetrievalActive: boolean;
}

const emptyStateImage = (
  <svg
    width="76"
    height="64"
    viewBox="0 0 76 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g id="Group 145">
      <path
        id="Vector"
        d="M46.897 46.0711C56.7342 36.282 58.3487 22.0173 50.5032 14.2101C42.6577 6.40285 28.3231 8.00951 18.486 17.7986C8.64888 27.5878 7.03435 41.8524 14.8798 49.6597C22.7253 57.4669 37.0599 55.8602 46.897 46.0711Z"
        stroke="url(#paint0_linear_10720_23418)"
        strokeWidth="1.5"
        strokeMiterlimit="10"
      />
      <path
        id="Vector_2"
        d="M52.3165 46.0721C62.1536 36.2829 63.7681 22.0183 55.9226 14.211C48.0771 6.40383 33.7426 8.01049 23.9054 17.7996C14.0683 27.5888 12.4538 41.8534 20.2993 49.6606C28.1448 57.4679 42.4794 55.8612 52.3165 46.0721Z"
        stroke="url(#paint1_linear_10720_23418)"
        strokeWidth="1.5"
        strokeMiterlimit="10"
      />
      <path
        id="Vector_3"
        d="M57.7354 46.0721C67.5725 36.2829 69.1871 22.0183 61.3416 14.211C53.4961 6.40383 39.1615 8.01049 29.3244 17.7996C19.4873 27.5888 17.8727 41.8534 25.7182 49.6606C33.5637 57.4679 47.8983 55.8612 57.7354 46.0721Z"
        stroke="url(#paint2_linear_10720_23418)"
        strokeWidth="1.5"
        strokeMiterlimit="10"
      />
    </g>
    <defs>
      <linearGradient
        id="paint0_linear_10720_23418"
        x1="7.45971"
        y1="29.1331"
        x2="55.0891"
        y2="34.5103"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#A75A3D" />
        <stop offset="1" stopColor="#BCB2FD" />
      </linearGradient>
      <linearGradient
        id="paint1_linear_10720_23418"
        x1="12.9979"
        y1="29.1441"
        x2="60.6273"
        y2="34.5213"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#BB5831" />
        <stop offset="1" stopColor="#BCB2FD" />
      </linearGradient>
      <linearGradient
        id="paint2_linear_10720_23418"
        x1="18.5356"
        y1="29.1542"
        x2="66.165"
        y2="34.5313"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#CF5726" />
        <stop offset="1" stopColor="#BCB2FD" />
      </linearGradient>
    </defs>
  </svg>
);

export function NewChat(props: NewChatProps) {
  return (
    <div
      className={cn("flex flex-col py-64 px-36 items-center justify-center")}
    >
      {emptyStateImage}
      <div className="flex items-center flex-col text-sm">
        <h2 className="text-xl">Welcome to LangGraph Studio!</h2>
        <br />
        <span>
          Make changes by editing the code in <code>backend/app/chain.py</code>.
        </span>
        <br />
        <span>
          Start a chat below, or load a previous chat from the sidebar.
        </span>
      </div>
      <div className="fixed left-0 lg:left-72 bottom-0 right-0 p-4">
        <TypingBox
          onSubmit={props.startChat}
          isDocumentRetrievalActive={props.isDocumentRetrievalActive}
        />
      </div>
    </div>
  );
}
