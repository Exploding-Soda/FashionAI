"use client"

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { Activity, Bot, Loader2, LogOut, Send, User as UserIcon } from "lucide-react"

const DEFAULT_LLM_MODEL = process.env.NEXT_PUBLIC_DEFAULT_LLM_MODEL || "gpt-4.1"

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
}

export default function DashboardPage() {
  const { user, token, isAuthenticated, logout } = useAuth()
  const router = useRouter()
  const [inputValue, setInputValue] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/")
    }
  }, [isAuthenticated, router])

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  if (!isAuthenticated) {
    return null
  }

  const hasConversation = messages.length > 0

  const sendMessage = async () => {
    const trimmed = inputValue.trim()
    if (!trimmed || !token) {
      return
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInputValue("")
    setError(null)
    setIsSending(true)

    try {
      const response = await fetch("/api/proxy/llm/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          model: DEFAULT_LLM_MODEL,
          messages: updatedMessages.map(({ role, content }) => ({ role, content })),
        }),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        const detail =
          result?.detail || result?.error?.message || "LLM request failed. Please try again."
        setError(detail)
        return
      }

      const replyContent =
        result?.choices?.[0]?.message?.content?.trim() || "No response from the model."

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: replyContent,
      }

      setMessages([...updatedMessages, assistantMessage])
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error occurred"
      setError(message)
    } finally {
      setIsSending(false)
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!isSending) {
      void sendMessage()
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      if (!isSending) {
        void sendMessage()
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-7xl mx-auto flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground">
              <Activity className="size-4" />
            </div>
            <span>FashionAI Dashboard</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-foreground">
              Welcome, {user?.username}
            </span>
            <Button variant="outline" size="sm" onClick={logout} className="rounded-full">
              <LogOut className="size-4 mr-2" />
              Log out
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto py-12">
        <section className="rounded-3xl bg-background/80 shadow-sm backdrop-blur">
          <div className="px-6 py-6">
            {!hasConversation ? (
              <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
                <div className="w-full max-w-2xl space-y-6">
                  <div className="space-y-2">
                    <h1 className="text-3xl font-semibold">Design with FashionAI</h1>
                    <p className="text-muted-foreground">
                      Describe the garment, mood, or constraints you have in mind and let the assistant craft a tailored concept for you.
                    </p>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="relative flex items-end rounded-3xl border border-border bg-background/60 p-4 shadow-sm transition focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
                      <Textarea
                        value={inputValue}
                        onChange={(event) => {
                          setInputValue(event.target.value)
                          if (error) {
                            setError(null)
                          }
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a design idea or question to begin..."
                        rows={3}
                        className="resize-none border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
                      />
                      <Button
                        type="submit"
                        className="ml-4 rounded-2xl"
                        disabled={isSending || !inputValue.trim()}
                      >
                        {isSending ? (
                          <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            Thinking
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 size-4" />
                            Send
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Press Enter to send, Shift + Enter for a new line
                    </p>
                  </form>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h1 className="text-lg font-semibold">FashionAI Design Companion</h1>
                  <p className="text-sm text-muted-foreground">
                    Keep ideating with the assistant and iterate on fabrics, silhouettes, and styling cues.
                  </p>
                </div>

                <ScrollArea className="h-[420px] pr-3">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-3",
                          message.role === "user" ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "flex max-w-[80%] items-start gap-3",
                            message.role === "user" ? "flex-row-reverse text-right" : "flex-row"
                          )}
                        >
                          <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full border bg-background">
                            {message.role === "user" ? (
                              <UserIcon className="size-4 text-primary" />
                            ) : (
                              <Bot className="size-4 text-secondary" />
                            )}
                          </div>
                          <div
                            className={cn(
                              "whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm shadow-sm",
                              message.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {message.content}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={endOfMessagesRef} />
                  </div>
                </ScrollArea>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <form onSubmit={handleSubmit} className="space-y-3">
                  <Textarea
                    value={inputValue}
                    onChange={(event) => {
                      setInputValue(event.target.value)
                      if (error) {
                        setError(null)
                      }
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask for refinements, materials, or styling directions..."
                    rows={4}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Press Enter to send, Shift + Enter for a new line
                    </span>
                    <Button
                      type="submit"
                      className="min-w-[120px]"
                      disabled={isSending || !inputValue.trim()}
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Thinking
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 size-4" />
                          Send
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}