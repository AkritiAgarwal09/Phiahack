import { useState } from "react";
import { Inbox, Send } from "lucide-react";
import SharedWithMe from "./SharedWithMe";
import MySharedCarts from "./MySharedCarts";

type Tab = "received" | "sent";

const SharedCartsHub = () => {
  const [tab, setTab] = useState<Tab>("received");

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-full border border-border bg-card p-1">
        <button
          onClick={() => setTab("received")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            tab === "received"
              ? "bg-primary text-primary-foreground shadow-gold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Inbox className="h-4 w-4" />
          Shared With Me
        </button>
        <button
          onClick={() => setTab("sent")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            tab === "sent"
              ? "bg-primary text-primary-foreground shadow-gold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Send className="h-4 w-4" />
          My Shared Carts
        </button>
      </div>

      <div>
        {/* Render the appropriate sub-page; their internal headers double as section titles */}
        {tab === "received" ? <SharedWithMe /> : <MySharedCarts />}
      </div>
    </div>
  );
};

export default SharedCartsHub;
