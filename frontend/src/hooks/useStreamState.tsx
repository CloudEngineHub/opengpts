import { useCallback, useState } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { Message } from "./useChatList";

export interface StreamState {
  status: "inflight" | "error" | "done";
  messages?: Message[];
  run_id?: string;
  merge?: boolean;
}

export interface StreamStateProps {
  stream: StreamState | null;
  startStream: (props: {
    input: Message[] | any | null;
    assistant_id: string;
    thread_id: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config?: Record<string, any>;
  }) => Promise<void>;
  stopStream?: (clear?: boolean) => void;
  setStreamStateStatus: (status: "inflight" | "error" | "done") => void;
  streamErrorMessage: string | null;
  setStreamErrorMessage: (message: string | null) => void;
}

export function useStreamState(): StreamStateProps {
  const [current, setCurrent] = useState<StreamState | null>(null);
  const [controller, setController] = useState<AbortController | null>(null);
  const [streamErrorMessage, setStreamErrorMessage] = useState<string | null>(
    null,
  );

  const startStream = useCallback(
    async (props: {
      input: Message[] | null;
      assistant_id: string;
      thread_id: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config?: Record<string, any>;
    }) => {
      const { input, assistant_id, thread_id, config } = props;
      const controller = new AbortController();
      setController(controller);
      setCurrent({ status: "inflight", messages: input || [], merge: true });
      await fetchEventSource("/runs/stream", {
        signal: controller.signal,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, assistant_id, thread_id, config }),
        openWhenHidden: true,
        onmessage(msg) {
          if (msg.event === "data") {
            const messages = JSON.parse(msg.data);
            setCurrent((current) => ({
              status: "inflight",
              messages,
              run_id: current?.run_id,
            }));
          } else if (msg.event === "metadata") {
            const { run_id } = JSON.parse(msg.data);
            setCurrent((current) => ({
              status: "inflight",
              messages: current?.messages,
              run_id: run_id,
              merge: current?.merge,
            }));
          } else if (msg.event === "error") {
            setCurrent((current) => ({
              status: "error",
              messages: current?.messages,
              run_id: current?.run_id,
            }));
            setStreamErrorMessage("Error received while streaming output.");
          }
        },
        onclose() {
          setCurrent((current) => ({
            status: current?.status === "error" ? current.status : "done",
            messages: current?.messages,
            run_id: current?.run_id,
            merge: current?.merge,
          }));
          setController(null);
        },
        onerror(error) {
          setCurrent((current) => ({
            status: "error",
            messages: current?.messages,
            run_id: current?.run_id,
            merge: current?.merge,
          }));
          setStreamErrorMessage("Error in stream.");
          setController(null);
          throw error;
        },
      });
    },
    [],
  );

  const stopStream = useCallback(
    (clear: boolean = false) => {
      controller?.abort();
      setController(null);
      if (clear) {
        setCurrent((current) => ({
          status: "done",
          run_id: current?.run_id,
        }));
      } else {
        setCurrent((current) => ({
          status: "done",
          messages: current?.messages,
          run_id: current?.run_id,
          merge: false,
        }));
      }
    },
    [controller],
  );

  const setStreamStateStatus = (value: "inflight" | "error" | "done") =>
    setCurrent((current) => ({ ...current, status: value }));

  return {
    startStream,
    stopStream,
    stream: current,
    setStreamStateStatus,
    streamErrorMessage,
    setStreamErrorMessage,
  };
}
