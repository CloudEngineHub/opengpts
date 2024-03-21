import { useEffect, useState } from "react";
import { Chat as ChatType, Message as MessageType } from "../hooks/useChatList";
import { StreamStateProps } from "../hooks/useStreamState";
import { useChatMessages } from "../hooks/useChatMessages";
import TypingBox from "./TypingBox";
import { Message } from "./Message";
import { ArrowDownCircleIcon } from "@heroicons/react/24/outline";
import { MessageWithFiles } from "../utils/formTypes.ts";
import { useHistories } from "../hooks/useHistories.ts";
import { Timeline } from "./Timeline.tsx";

interface ChatProps extends Pick<StreamStateProps, "stream" | "stopStream"> {
  chat: ChatType;
  startStream: (props: {
    message?: MessageWithFiles;
    previousMessages?: MessageType[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config?: Record<string, any>;
  }) => Promise<void>;
  isDocumentRetrievalActive: boolean;
}

export function Chat(props: ChatProps) {
  const { resumeable } = useChatMessages(
    props.chat.thread_id,
    props.stream,
    props.stopStream,
  );
  const { histories, setHistories } = useHistories(
    props.chat.thread_id,
    props.stream,
  );
  const displayHistories = [...(histories ?? [])].reverse();
  const [activeHistoryIndex, setActiveHistoryIndex] = useState(0);
  const activeHistory = displayHistories[activeHistoryIndex];
  useEffect(() => {
    setActiveHistoryIndex(histories.length > 0 ? histories.length - 1 : 0);
  }, [histories]);
  return (
    <div className="flex-1 flex flex-col items-stretch pb-[76px] pt-2 mb-16">
      <div className="flex flex-col-reverse">
        {[...(activeHistory?.values ? activeHistory.values : [])]
          .reverse()
          .map((msg, i) => (
            <Message
              {...msg}
              key={msg.id ?? i}
              onUpdate={(newMessage) => {
                setHistories((prevHistories) => {
                  return [
                    ...prevHistories.map((history) => {
                      const matchingIndex = history.values.findIndex(
                        (historyMessage: MessageType) =>
                          historyMessage.id === newMessage.id,
                      );
                      if (matchingIndex !== -1) {
                        return {
                          ...history,
                          values: [
                            ...history.values.slice(0, matchingIndex),
                            newMessage,
                            ...history.values.slice(matchingIndex + 1),
                          ],
                        };
                      }
                      return history;
                    }),
                  ];
                });
              }}
              onRerunPressed={() => {
                const oldestMatchingHistoryIndex =
                  histories.length -
                  1 -
                  [...histories].reverse().findIndex((history) => {
                    return (
                      history.resumeable &&
                      !!history.values.find((message) => {
                        return message.id === msg.id;
                      })
                    );
                  });
                console.log(
                  oldestMatchingHistoryIndex,
                  histories[oldestMatchingHistoryIndex],
                  histories,
                );
                if (oldestMatchingHistoryIndex === histories.length) {
                  return;
                }
                props.startStream({
                  previousMessages: [
                    ...histories[oldestMatchingHistoryIndex].values,
                  ],
                  config: { ...histories[oldestMatchingHistoryIndex].config },
                });
                setHistories((prevHistories) =>
                  prevHistories.slice(oldestMatchingHistoryIndex),
                );
              }}
              runId={
                i === (activeHistory?.values ?? []).length - 1 &&
                props.stream?.status === "done"
                  ? props.stream?.run_id
                  : undefined
              }
            />
          ))}
      </div>
      {(props.stream?.status === "inflight" ||
        activeHistory?.values == null) && (
        <div className="leading-6 mb-2 animate-pulse font-black text-gray-400 text-lg">
          ...
        </div>
      )}
      {props.stream?.status === "error" && (
        <div className="flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
          An error has occurred. Please try again.
        </div>
      )}
      {resumeable && props.stream?.status !== "inflight" && (
        <div
          className="flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-800 ring-1 ring-inset ring-yellow-600/20 cursor-pointer"
          onClick={() => props.startStream({})}
        >
          <ArrowDownCircleIcon className="h-5 w-5 mr-1" />
          Click to continue.
        </div>
      )}
      <div className="fixed left-0 lg:left-72 bottom-0 right-0 p-4 bg-gray-100">
        <Timeline
          disabled={props.stream?.status === "inflight"}
          histories={displayHistories}
          activeHistoryIndex={activeHistoryIndex}
          onChange={(newValue: number) => setActiveHistoryIndex(newValue)}
        ></Timeline>
        <TypingBox
          onSubmit={(dataWithFiles) => {
            return props.startStream({
              message: dataWithFiles,
              previousMessages: [...(activeHistory?.values ?? [])],
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
