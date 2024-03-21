import { useEffect, useState } from "react";
import { Message as MessageType } from "./useChatList";
import { StreamState } from "./useStreamState";

async function getHistories(threadId: string) {
  const response = await fetch(`/threads/${threadId}/history`, {
    headers: {
      Accept: "application/json",
    },
  }).then((r) => r.json());
  return response;
}

export interface History {
  values: MessageType[];
  resumeable: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: Record<string, any>;
}

export function useHistories(
  threadId: string | null,
  stream: StreamState | null,
): {
  histories: History[];
  resumeable: boolean;
  setHistories: React.Dispatch<React.SetStateAction<History[]>>;
} {
  const [histories, setHistories] = useState<History[]>([]);
  const [resumeable, setResumeable] = useState(false);

  useEffect(() => {
    async function fetchHistories() {
      if (threadId) {
        const histories = await getHistories(threadId);
        setHistories(histories);
        setResumeable(resumeable);
      }
    }
    fetchHistories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, stream?.messages]);

  return { histories, resumeable, setHistories };
}
