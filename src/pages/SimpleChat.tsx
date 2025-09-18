import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Send } from "lucide-react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { getUser, User, sendChatMessage, subscribeToChatMessages } from "@/lib/firestore";

interface ChatProps {
  chatId: string;
  otherUserId: string;
}

const SimpleChat: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Get other user ID from chat participants
  const [otherUserId, setOtherUserId] = useState<string>("");

  // 🔹 Ensure chat doc exists and get other user
  useEffect(() => {
    if (!chatId || !auth.currentUser) return;

    const chatRef = doc(db, "chats", chatId);
    
    // First, try to get existing chat to find other user
    getDoc(chatRef).then((chatDoc) => {
      if (chatDoc.exists()) {
        const chatData = chatDoc.data();
        const participants = chatData?.participants || [];
        const otherUid = participants.find((uid: string) => uid !== auth.currentUser?.uid);
        if (otherUid) {
          setOtherUserId(otherUid);
          // Fetch other user data
          getUser(otherUid).then(setOtherUser);
        }
      } else {
        // Chat doesn't exist, this shouldn't happen in our transaction-based system
        console.error('Chat not found:', chatId);
      }
      setLoading(false);
    }).catch((error) => {
      console.error('Error setting up chat:', error);
      setLoading(false);
    });
  }, [chatId]);

  // 🔹 Fetch messages
  useEffect(() => {
    if (!chatId) return;

    const unsubscribe = subscribeToChatMessages(chatId, (msgs) => {
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [chatId]);

  // 🔹 Send message & update lastMessage
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !auth.currentUser || !chatId) return;

    try {
      await sendChatMessage(chatId, auth.currentUser.uid, newMessage);
      setNewMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-muted-foreground">Loading chat...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/chat')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                {otherUser?.name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-semibold">
                {otherUser?.name || 'Unknown User'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {otherUser?.verified ? 'Verified User' : 'Unverified User'}
              </p>
            </div>
          </div>
        </div>

        {/* Chat Container */}
        <Card className="glass-card h-[calc(100vh-12rem)] flex flex-col">
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderId === auth.currentUser?.uid ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`p-3 rounded-lg max-w-xs lg:max-w-md ${
                        msg.senderId === auth.currentUser?.uid
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      <p className="text-sm">{msg.text}</p>
                      <p className={`text-xs mt-1 ${
                        msg.senderId === auth.currentUser?.uid 
                          ? 'text-primary-foreground/70' 
                          : 'text-muted-foreground'
                      }`}>
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="p-4 flex gap-2 border-t">
              <Input
                type="text"
                className="flex-1"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <Button type="submit" size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SimpleChat;
