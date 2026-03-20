'use client';

import { Plus, Search, MessageSquare, Send, Filter, MoreHorizontal } from "lucide-react";
import { useMerchant } from "@/lib/state/merchantContext";
import { useQuery } from "@tanstack/react-query";
import { messagesService } from "@/lib/api/messages.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function MessagesPage() {
  const { storeId, formatDateTime } = useMerchant();
  const { data, isLoading } = useQuery({
    queryKey: ["messages", storeId],
    queryFn: () => messagesService.listStoreMessages(storeId),
    enabled: !!storeId,
  });

  const threads = data?.threads ?? [];
  const messages = data?.rows ?? [];

  return (
    <div className="flex h-[calc(100vh-120px)] gap-6 overflow-hidden">
      <Card className="flex flex-col w-[320px] lg:w-[380px] shrink-0">
        <CardHeader className="pb-3 px-4">
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="text-xl">Messages</CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search threads..." className="pl-9 h-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="flex flex-col">
              {isLoading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Loading chats...</div>
              ) : threads.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center gap-2">
                  <MessageSquare className="h-8 w-8 opacity-10" />
                  <p className="text-xs text-muted-foreground font-medium">No conversations found</p>
                </div>
              ) : (
                threads.map((thread) => (
                  <button 
                    key={thread.threadKey} 
                    className="flex items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50 border-b last:border-0 relative"
                  >
                    <Avatar className="h-10 w-10 border">
                      <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                        {thread.customerLabel.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm truncate">{thread.customerLabel}</span>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatDateTime(thread.lastMessageAt).split(',')[0]}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 leading-snug">
                        {thread.lastMessage}
                      </p>
                      <div className="flex items-center gap-1.5 pt-1">
                        <Badge variant="outline" className="text-[9px] px-1 h-4 font-bold uppercase tracking-wider">{thread.channel}</Badge>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="flex-1 flex flex-col overflow-hidden">
        {threads.length > 0 ? (
          <>
            <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between shrink-0">
               <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border">
                    <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">GC</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-sm">Guest Customer</CardTitle>
                    <CardDescription className="text-[10px]">Online via Discovery App</CardDescription>
                  </div>
               </div>
               <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><Filter className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><MoreHorizontal className="h-4 w-4" /></Button>
               </div>
            </CardHeader>
            <CardContent className="flex-1 p-4 overflow-hidden bg-muted/5">
              <ScrollArea className="h-full pr-4">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col items-center justify-center py-4">
                    <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground bg-muted/20">Today</Badge>
                  </div>
                  
                  {messages.map(msg => (
                    <div key={msg.id} className={cn("flex flex-col max-w-[80%]", msg.senderType === 'store' ? "ml-auto items-end" : "mr-auto items-start")}>
                      <div className={cn(
                        "rounded-2xl p-3 text-sm shadow-sm",
                        msg.senderType === 'store' 
                          ? "bg-primary text-primary-foreground rounded-tr-none" 
                          : "bg-card border rounded-tl-none"
                      )}>
                        {msg.message}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 px-1">{formatDateTime(msg.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
            <div className="p-4 border-t flex items-center gap-2 bg-card shrink-0">
              <Input placeholder="Type your message..." className="flex-1 h-10 rounded-full px-4" />
              <Button size="icon" className="h-10 w-10 rounded-full shadow-lg">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
            <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground">
              <MessageSquare className="h-10 w-10 opacity-20" />
            </div>
            <div>
              <h3 className="text-lg font-bold">No conversation selected</h3>
              <p className="text-sm text-muted-foreground max-w-sm">Choose a thread from the left or start a new message to your customers.</p>
            </div>
            <Button variant="outline" className="mt-2">New Conversation</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
