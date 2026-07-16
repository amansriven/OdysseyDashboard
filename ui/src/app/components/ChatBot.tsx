import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X, Loader2, Bot, User as UserIcon } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

type AgentType = "claim" | "benefits" | "compliance";

const AGENT_INFO = {
  claim: {
    name: "Claim Assistant",
    description: "Process and explain claim details",
    placeholder: "Enter claim ID (e.g., CLM000377)",
  },
  benefits: {
    name: "Benefits Navigator",
    description: "Answer coverage and prior auth questions",
    placeholder: "Ask about coverage (e.g., Does CPT 29881 need prior auth on DSNP?)",
  },
  compliance: {
    name: "Compliance Monitor",
    description: "Triage operational risk flags",
    placeholder: "Ask about compliance issues (e.g., What ROI gaps need attention?)",
  },
};

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentType>("claim");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_type: selectedAgent,
          message: userMessage.content,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response || "No response received.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: "assistant",
        content: `Error: ${error instanceof Error ? error.message : "Failed to connect to agent"}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center group z-50"
        >
          <MessageCircle className="w-7 h-7 text-white group-hover:scale-110 transition-transform" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-slate-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Odyssey AI</h3>
                <p className="text-emerald-50 text-xs">{AGENT_INFO[selectedAgent].name}</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 p-1.5 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Agent Selector */}
          <div className="p-3 border-b border-slate-200 bg-slate-50">
            <div className="flex gap-2">
              {(Object.keys(AGENT_INFO) as AgentType[]).map((agent) => (
                <button
                  key={agent}
                  onClick={() => setSelectedAgent(agent)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    selectedAgent === agent
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "bg-white text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {AGENT_INFO[agent].name.split(" ")[0]}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">{AGENT_INFO[selectedAgent].description}</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-slate-400 text-sm mt-8">
                <Bot className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="font-medium">How can I help you today?</p>
                <p className="text-xs mt-1">{AGENT_INFO[selectedAgent].placeholder}</p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-emerald-600" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                    msg.role === "user"
                      ? "bg-emerald-500 text-white rounded-tr-sm"
                      : "bg-slate-100 text-slate-800 rounded-tl-sm"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      msg.role === "user" ? "text-emerald-100" : "text-slate-400"
                    }`}
                  >
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                    <UserIcon className="w-5 h-5 text-slate-600" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="bg-slate-100 px-4 py-2.5 rounded-2xl rounded-tl-sm">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-200 bg-white rounded-b-2xl">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={AGENT_INFO[selectedAgent].placeholder}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
