import { useEffect, useState } from "react";
import { Chat as ChatType } from "../hooks/useChatList";
import { StreamStateProps } from "../hooks/useStreamState";
import { useHistories } from "../hooks/useHistories";
import { deepEquals } from "../utils/equals";
import { Timeline } from "./Timeline";
import { JsonEditor } from "./JsonEditor";

interface StateGraphDebuggerProps
  extends Pick<
    StreamStateProps,
    "stream" | "stopStream" | "streamErrorMessage" | "setStreamErrorMessage"
  > {
  chat: ChatType;
  startStateGraph: (props: {
    state: string | null;
    assistant_id: string;
    thread_id: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config?: Record<string, any>;
  }) => Promise<void>;
}

export function StateGraphDebugger(props: StateGraphDebuggerProps) {
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
  const [localState, setLocalState] = useState<string>("{}");
  useEffect(() => {
    setLocalState(JSON.stringify(activeHistory?.values, null, 2));
  }, [activeHistory]);
  useEffect(() => {
    setActiveDisplayedHistoryIndex(
      displayHistories.length > 0 ? displayHistories.length - 1 : 0,
    );
  }, [displayHistories.length]);
  useEffect(
    () => props.setStreamErrorMessage(null),
    [activeDisplayedHistoryIndex],
  );
  return (
    // TODO: Remove hacky negative margin
    <div className="flex-1 flex flex-col items-stretch pb-[76px] mb-32 -mx-4">
      <h2 className="uppercase text-sm opacity-50">Current graph state</h2>
      <JsonEditor
        height="53vh"
        value={localState}
        setValue={setLocalState}
        hideSubmitButton={true}
        disabled={true}
      ></JsonEditor>
      {props.stream?.status === "inflight" && (
        <div className="leading-6 mb-2 animate-pulse font-black text-gray-400 text-2xl mx-auto">
          ...
        </div>
      )}
      {(props.streamErrorMessage || props.stream?.status === "error") && (
        <div className="mt-2 flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-800 ring-1 ring-inset ring-red-600/20">
          {props.streamErrorMessage ??
            "An error has occurred. Please try again."}
        </div>
      )}
      {/* {props.stream?.status !== "inflight" &&
        activeDisplayedHistoryIndex < displayHistories.length - 1 && (
          <div
            className="mt-2 flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-800 ring-1 ring-inset ring-yellow-600/20 cursor-pointer"
            onClick={async () => {
              try {
                const body = JSON.stringify({
                  values: JSON.parse(localState),
                  config: { ...activeHistory?.config },
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
                  throw new Error(json.detail ?? "Unspecified error.");
                }
                props.startStateGraph({
                  state: null,
                  assistant_id: props.chat.assistant_id,
                  thread_id: props.chat.thread_id,
                  config: { ...json },
                });
              } catch (e: any) {
                props.setStreamErrorMessage(e.message);
              }
            }}
          >
            <ArrowPathIcon className="h-5 w-5 mr-1" />
            Resume execution.
          </div>
        )} */}
      <div className="fixed left-0 lg:left-72 bottom-0 right-0 p-4 bg-gray-100">
        <Timeline
          disabled={props.stream?.status === "inflight"}
          histories={displayHistories}
          activeHistoryIndex={activeDisplayedHistoryIndex}
          onChange={(newValue: number) => {
            setLocalState(
              JSON.stringify(displayHistories[newValue]?.values ?? {}, null, 2),
            );
            setActiveDisplayedHistoryIndex(newValue);
          }}
        ></Timeline>
        <JsonEditor
          onSubmit={(data) => {
            props.startStateGraph({
              state: data,
              assistant_id: props.chat.assistant_id,
              thread_id: props.chat.thread_id,
              config: { ...activeHistory?.config },
            });
          }}
          onInterrupt={
            props.stream?.status === "inflight" ? props.stopStream : undefined
          }
          inflight={props.stream?.status === "inflight"}
        />
      </div>
    </div>
  );
}
