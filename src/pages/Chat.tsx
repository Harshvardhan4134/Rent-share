import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  sendTransactionMessage, 
  subscribeToTransactionMessages, 
  getTransaction, 
  getListing, 
  getUser,
  Message,
  Transaction,
  Listing,
  User
} from "@/lib/firestore";
import { auth } from "@/lib/firebase";
import { 
  ArrowLeft, 
  Send, 
  Package, 
  User as UserIcon,
  Calendar,
  DollarSign,
  MapPin
} from "lucide-react";

const Chat = () => {
  const { transactionId } = useParams<{ transactionId: string }>();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);

  useEffect(() => {
    if (!transactionId || !auth.currentUser) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch transaction data
        const transactionData = await getTransaction(transactionId);
        if (!transactionData) {
          navigate('/transactions');
          return;
        }
        
        setTransaction(transactionData);

        // Fetch listing and other user data
        const [listingData, otherUserData] = await Promise.all([
          getListing(transactionData.itemId),
          getUser(transactionData.ownerId === auth.currentUser.uid 
            ? transactionData.renterId 
            : transactionData.ownerId)
        ]);

        setListing(listingData);
        setOtherUser(otherUserData);

        // Subscribe to messages
        const unsubscribe = subscribeToTransactionMessages(transactionId, (newMessages) => {
          setMessages(newMessages);
          scrollToBottom();
        });

        return unsubscribe;
      } catch (error) {
        console.error('Error fetching chat data:', error);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = fetchData();
    return () => {
      if (unsubscribe) {
        unsubscribe.then(unsub => unsub && unsub());
      }
    };
  }, [transactionId, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !auth.currentUser || !transactionId) return;

    setSending(true);
    try {
      await sendTransactionMessage(transactionId, {
        senderId: auth.currentUser.uid,
        text: newMessage.trim()
      });
      setNewMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
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

  if (!transaction || !listing || !otherUser) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Chat not found</h1>
            <Button onClick={() => navigate('/transactions')}>
              Back to Transactions
            </Button>
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
            onClick={() => navigate('/transactions')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-urbanist font-bold">
              Chat with <span className="gradient-text">{otherUser.name}</span>
            </h1>
            <p className="text-muted-foreground">Transaction: {listing.title}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6 h-[calc(100vh-12rem)]">
          {/* Transaction Info Sidebar */}
          <div className="lg:col-span-1">
            <Card className="glass-card h-full">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Transaction Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <img 
                    src={listing.images[0] || "/placeholder.svg"} 
                    alt={listing.title}
                    className="w-12 h-12 object-cover rounded-lg"
                  />
                  <div>
                    <h3 className="font-semibold text-sm">{listing.title}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {listing.category}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <UserIcon className="h-4 w-4" />
                    <span>Owner: {otherUser.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {transaction.startDate?.toDate().toLocaleDateString()} - {transaction.endDate?.toDate().toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>₹{transaction.amount} ({transaction.paymentMode})</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {listing.location ? 
                        `${listing.location.latitude.toFixed(2)}, ${listing.location.longitude.toFixed(2)}` : 
                        'Location not set'
                      }
                    </span>
                  </div>
                </div>

                <Badge className={`w-full justify-center ${transaction.status === 'active' ? 'bg-green-500' : transaction.status === 'pending' ? 'bg-yellow-500' : 'bg-blue-500'}`}>
                  {transaction.status.toUpperCase()}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            <Card className="glass-card h-full flex flex-col">
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                      {otherUser.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{otherUser.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {otherUser.verified ? 'Verified User' : 'Unverified User'}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col p-0">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isOwn = message.senderId === auth.currentUser?.uid;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              isOwn
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground'
                            }`}
                          >
                            <p className="text-sm">{message.text}</p>
                            <p className={`text-xs mt-1 ${
                              isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                            }`}>
                              {formatTime(message.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="border-t p-4">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1"
                      disabled={sending}
                    />
                    <Button 
                      type="submit" 
                      disabled={!newMessage.trim() || sending}
                      size="icon"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
