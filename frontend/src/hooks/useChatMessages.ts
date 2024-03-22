import { useEffect, useMemo, useRef, useState } from "react";
import { Message } from "./useChatList";
import { StreamState } from "./useStreamState";

async function getState(threadId: string) {
  const { values, resumeable } = await fetch(`/threads/${threadId}/state`, {
    headers: {
      Accept: "application/json",
    },
  }).then((r) => r.json());
  return { values, resumeable };
}

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

export function useChatMessages(
  threadId: string | null,
  stream: StreamState | null,
  stopStream?: (clear?: boolean) => void,
): {
  messages: Message[] | null;
  resumeable: boolean;
} {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [resumeable, setResumeable] = useState(false);
  const prevStreamStatus = usePrevious(stream?.status);

  useEffect(() => {
    async function fetchMessages() {
      if (threadId) {
        const { values, resumeable } = await getState(threadId);
        setMessages(values);
        setResumeable(resumeable);
      }
    }

    fetchMessages();

    return () => {
      setMessages(null);
    };
  }, [threadId]);

  useEffect(() => {
    async function fetchMessages() {
      if (threadId) {
        const { values, resumeable } = await getState(threadId);
        setMessages(values);
        setResumeable(resumeable);
        stopStream?.(true);
      }
    }

    if (prevStreamStatus === "inflight" && stream?.status !== "inflight") {
      setResumeable(false);
      fetchMessages();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream?.status]);

  const memoizedValues = useMemo(() => {
    return {
      messages: stream?.merge
        ? [...(messages ?? []), ...(stream.messages ?? [])]
        : stream?.messages ?? messages,
      resumeable,
    };
  }, [messages, stream?.merge, stream?.messages, resumeable]);
  return { ...memoizedValues };
}
