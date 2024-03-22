import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

if (document.cookie.indexOf("user_id") === -1) {
  document.cookie = `opengpts_user_id=00000000-0000-0000-0000-000000000000`;
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
