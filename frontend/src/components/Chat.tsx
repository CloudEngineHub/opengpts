import { useEffect, useRef, useState } from "react";
import { Chat as ChatType, Message as MessageType } from "../hooks/useChatList";
import { StreamStateProps } from "../hooks/useStreamState";
import { useChatMessages } from "../hooks/useChatMessages";
import TypingBox from "./TypingBox";
import { Message } from "./Message";
import {
  ArrowPathIcon,
  ArrowDownCircleIcon,
} from "@heroicons/react/24/outline";
import { MessageWithFiles } from "../utils/formTypes.ts";
import { useHistories } from "../hooks/useHistories.ts";
import { Timeline } from "./Timeline.tsx";
import { deepEquals } from "../utils/equals.ts";

interface ChatProps
  extends Pick<
    StreamStateProps,
    "stream" | "stopStream" | "streamErrorMessage" | "setStreamErrorMessage"
  > {
  chat: ChatType;
  startStream: (props: {
    message?: MessageWithFiles;
    previousMessages?: MessageType[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config?: Record<string, any>;
  }) => Promise<void>;
  isDocumentRetrievalActive: boolean;
}

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

export function Chat(props: ChatProps) {
  const { messages: serverMessages, resumeable } = useChatMessages(
    props.chat.thread_id,
    props.stream,
    props.stopStream,
  );
  const { histories } = useHistories(props.chat.thread_id, props.stream);
  const displayHistories = [...(histories ?? [])]
    .reverse()
    .filter((history) => history.resumeable)
    .filter(
      (history, i, self) => !deepEquals(history.values, self[i - 1]?.values),
    );
  const [activeDisplayedHistoryIndex, setActiveDisplayedHistoryIndex] =
    useState(0);
  const activeHistory = displayHistories[activeDisplayedHistoryIndex];
  const [messageEditStatuses, setMessageEditStatuses] = useState<boolean[]>([]);
  const [localMessages, setLocalMessages] = useState<MessageType[]>([]);

  useEffect(() => {
    setMessageEditStatuses(localMessages.map(() => false) ?? []);
  }, [localMessages]);
  useEffect(() => {
    setActiveDisplayedHistoryIndex(
      displayHistories.length > 0 ? displayHistories.length - 1 : 0,
    );
  }, [displayHistories.length]);
  useEffect(() => {
    setLocalMessages([...(serverMessages ?? [])]);
  }, [serverMessages]);
  useEffect(
    () => props.setStreamErrorMessage(null),
    [activeDisplayedHistoryIndex],
  );

  const updateMessage = (newMessage: MessageType) => {
    setLocalMessages((prevLocalMessages) => {
      const updatedMessageIndex = localMessages.findIndex(
        (message: MessageType) => message.id === newMessage.id,
      );
      return [
        ...prevLocalMessages.slice(0, updatedMessageIndex),
        newMessage,
        ...prevLocalMessages.slice(updatedMessageIndex + 1),
      ];
    });
  };
  const prevMessages = usePrevious(serverMessages);
  useEffect(() => {
    scrollTo({
      top: document.body.scrollHeight,
      behavior:
        prevMessages && prevMessages?.length === serverMessages?.length
          ? "smooth"
          : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverMessages]);
  return (
    <div className="flex-1 flex flex-col items-stretch pb-[76px] pt-2 mb-16">
      <div className="flex flex-col">
        {[...localMessages].map((msg, i) => (
          <Message
            {...msg}
            key={`${msg.id}:${msg.content}`}
            editMode={messageEditStatuses[i]}
            setEditMode={(newValue) => {
              setMessageEditStatuses((prevStatuses) => {
                const newStatuses = [...prevStatuses];
                newStatuses[i] = newValue;
                return newStatuses;
              });
            }}
            onUpdate={updateMessage}
            runId={
              activeDisplayedHistoryIndex === displayHistories.length - 1 &&
              i === (activeHistory?.values ?? []).length - 1 &&
              props.stream?.status === "done"
                ? props.stream?.run_id
                : undefined
            }
          />
        ))}
      </div>
      {(props.stream?.status === "inflight" || localMessages == null) && (
        <div className="leading-6 mb-2 animate-pulse font-black text-gray-400 text-lg">
          ...
        </div>
      )}
      {(props.streamErrorMessage || props.stream?.status === "error") && (
        <div className="flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
          {props.streamErrorMessage ??
            "An error has occurred. Please try again."}
        </div>
      )}
      {resumeable &&
        activeDisplayedHistoryIndex === displayHistories.length - 1 &&
        props.stream?.status !== "inflight" && (
          <div
            className="flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-800 ring-1 ring-inset ring-yellow-600/20 cursor-pointer"
            onClick={async () => {
              const body = JSON.stringify({
                messages: [...(localMessages ?? [])],
              });
              const res = await fetch(
                `/threads/${props.chat.thread_id}/state`,
                {
                  method: "POST",
                  headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                  },
                  body,
                },
              );
              const json = await res.json();
              if (!res.ok) {
                props.setStreamErrorMessage(
                  json.detail ?? "Unspecified error.",
                );
              } else {
                props.startStream({});
              }
            }}
          >
            <ArrowDownCircleIcon className="h-5 w-5 mr-1" />
            Permit tool execution.
          </div>
        )}
      {!messageEditStatuses.find((status) => status) &&
        activeDisplayedHistoryIndex < displayHistories.length - 1 && (
          <div
            className="flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-800 ring-1 ring-inset ring-yellow-600/20 cursor-pointer"
            onClick={() =>
              props.startStream({
                previousMessages: [...(localMessages ?? [])],
                config: { ...activeHistory?.config },
              })
            }
          >
            <ArrowPathIcon className="h-5 w-5 mr-1" />
            Rerun current history.
          </div>
        )}
      <div className="fixed left-0 lg:left-72 bottom-0 right-0 p-4 bg-gray-100">
        <Timeline
          disabled={props.stream?.status === "inflight"}
          histories={displayHistories}
          activeHistoryIndex={activeDisplayedHistoryIndex}
          onChange={(newValue: number) => {
            setLocalMessages([...(displayHistories[newValue]?.values ?? [])]);
            setActiveDisplayedHistoryIndex(newValue);
          }}
        ></Timeline>
        <TypingBox
          disabled={messageEditStatuses.find((status) => status)}
          onSubmit={(dataWithFiles) => {
            return props.startStream({
              message: dataWithFiles,
              previousMessages: [...(localMessages ?? [])],
              config: { ...activeHistory?.config },
            });
          }}
          onInterrupt={
            props.stream?.status === "inflight" ? props.stopStream : undefined
          }
          inflight={props.stream?.status === "inflight"}
          isDocumentRetrievalActive={props.isDocumentRetrievalActive}
        />
      </div>
    </div>
  );
}
