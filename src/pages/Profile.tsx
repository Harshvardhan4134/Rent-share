import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Star, 
  Edit, 
  Settings, 
  LogOut, 
  Heart, 
  Package, 
  DollarSign,
  Camera,
  Save,
  X,
  Calendar,
  Eye,
  MessageCircle,
  Trash2
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { getUser, updateUser, getListingsByOwner, deleteListing, updateListing, User as UserType, Listing } from "@/lib/firestore";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<UserType | null>(null);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [savedListings, setSavedListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [editListingForm, setEditListingForm] = useState({
    title: '',
    description: '',
    rentPerDay: 0,
    category: '',
  });

  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }

    const fetchUserData = async () => {
      try {
        setLoading(true);
        const userData = await getUser(auth.currentUser!.uid);
        if (userData) {
          setUser(userData);
          setEditForm({
            name: userData.name,
            email: userData.email,
            phone: userData.phone,
          });
        }

        // Fetch user's listings
        const listings = await getListingsByOwner(auth.currentUser!.uid);
        setMyListings(listings);

        // TODO: Implement saved listings functionality
        setSavedListings([]);
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate, toast]);

  const handleEditProfile = async () => {
    if (!auth.currentUser) return;

    try {
      await updateUser(auth.currentUser.uid, {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
      });

      setUser(prev => prev ? { ...prev, ...editForm } : null);
      setEditing(false);
      
      toast({
        title: "Success",
        description: "Profile updated successfully"
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
      toast({
        title: "Logged out",
        description: "You have been successfully logged out"
      });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive"
      });
    }
  };

  const handleEditListing = (listing: Listing) => {
    setEditingListing(listing);
    setEditListingForm({
      title: listing.title,
      description: listing.description,
      rentPerDay: listing.rentPerDay,
      category: listing.category,
    });
  };

  const handleUpdateListing = async () => {
    if (!editingListing) return;

    try {
      await updateListing(editingListing.id, {
        title: editListingForm.title,
        description: editListingForm.description,
        rentPerDay: editListingForm.rentPerDay,
        category: editListingForm.category,
      });

      // Refresh listings
      const listings = await getListingsByOwner(auth.currentUser!.uid);
      setMyListings(listings);

      setEditingListing(null);
      toast({
        title: "Success",
        description: "Listing updated successfully",
      });
    } catch (error) {
      console.error('Error updating listing:', error);
      toast({
        title: "Error",
        description: "Failed to update listing",
        variant: "destructive"
      });
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    if (window.confirm('Are you sure you want to delete this listing? This action cannot be undone.')) {
      try {
        await deleteListing(listingId, auth.currentUser!.uid);
        
        // Refresh listings
        const listings = await getListingsByOwner(auth.currentUser!.uid);
        setMyListings(listings);

        toast({
          title: "Success",
          description: "Listing deleted successfully",
        });
      } catch (error) {
        console.error('Error deleting listing:', error);
        toast({
          title: "Error",
          description: "Failed to delete listing",
          variant: "destructive"
        });
      }
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    return timestamp.toDate().toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-muted-foreground">Loading profile...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Profile not found</h1>
            <Button onClick={() => navigate('/explore')}>
              Back to Explore
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
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-2xl">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-urbanist font-bold">
                <span className="gradient-text">{user.name}</span>
              </h1>
              <p className="text-muted-foreground">{user.email}</p>
              <div className="flex items-center mt-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                <span className="text-sm">{user.rating.toFixed(1)} (0 reviews)</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <Dialog open={editing} onOpenChange={setEditing}>
              <DialogTrigger asChild>
                <Button variant="outline" className="glass-effect">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Profile</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={editForm.phone}
                      onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleEditProfile} className="flex-1">
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => setEditing(false)} className="flex-1">
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Edit Listing Dialog */}
            <Dialog open={!!editingListing} onOpenChange={() => setEditingListing(null)}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Edit Listing</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={editListingForm.title}
                      onChange={(e) => setEditListingForm(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={editListingForm.description}
                      onChange={(e) => setEditListingForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="rentPerDay">Rent Per Day ($)</Label>
                    <Input
                      id="rentPerDay"
                      type="number"
                      value={editListingForm.rentPerDay}
                      onChange={(e) => setEditListingForm(prev => ({ ...prev, rentPerDay: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={editListingForm.category}
                      onChange={(e) => setEditListingForm(prev => ({ ...prev, category: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditingListing(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateListing}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="outline" className="glass-effect" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="info" className="space-y-6">
          <TabsList className="glass-effect border-0">
            <TabsTrigger value="info">User Info</TabsTrigger>
            <TabsTrigger value="rentals">My Rentals</TabsTrigger>
            <TabsTrigger value="saved">Saved Rentals</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{user.phone || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Member since</p>
                      <p className="font-medium">{formatDate(user.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Wallet Balance</p>
                      <p className="font-medium">${user.wallet}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Star className="h-5 w-5 mr-2" />
                    Account Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Verification Status</span>
                    <Badge className={user.verified ? 'bg-green-500' : 'bg-yellow-500'}>
                      {user.verified ? 'Verified' : 'Unverified'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Rating</span>
                    <div className="flex items-center">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                      <span className="font-medium">{user.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Listings</span>
                    <span className="font-medium">{myListings.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Saved Items</span>
                    <span className="font-medium">{savedListings.length}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="rentals">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  My Rentals ({myListings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {myListings.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No listings yet</h3>
                    <p className="text-muted-foreground mb-4">Start by posting your first item to rent</p>
                    <Button onClick={() => navigate('/post')}>
                      Post Your First Item
                    </Button>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myListings.map((listing) => (
                      <Card key={listing.id} className="glass-card hover-scale">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <img 
                              src={listing.images[0] || "/placeholder.svg"} 
                              alt={listing.title}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            <div>
                              <h3 className="font-semibold text-sm">{listing.title}</h3>
                              <p className="text-xs text-muted-foreground line-clamp-2">{listing.description}</p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="font-bold text-primary">${listing.rentPerDay}/day</span>
                                <Badge variant="secondary" className="text-xs">
                                  {listing.category}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="flex-1"
                                  onClick={() => navigate(`/item/${listing.id}`)}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="flex-1"
                                  onClick={() => handleEditListing(listing)}
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-red-500 border-red-500 hover:bg-red-50"
                                  onClick={() => handleDeleteListing(listing.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="saved">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Heart className="h-5 w-5 mr-2" />
                  Saved Rentals ({savedListings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {savedListings.length === 0 ? (
                  <div className="text-center py-8">
                    <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No saved items</h3>
                    <p className="text-muted-foreground mb-4">Items you save will appear here</p>
                    <Button onClick={() => navigate('/explore')}>
                      Explore Items
                    </Button>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {savedListings.map((listing) => (
                      <Card key={listing.id} className="glass-card hover-scale">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <img 
                              src={listing.images[0] || "/placeholder.svg"} 
                              alt={listing.title}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            <div>
                              <h3 className="font-semibold text-sm">{listing.title}</h3>
                              <p className="text-xs text-muted-foreground line-clamp-2">{listing.description}</p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="font-bold text-primary">${listing.rentPerDay}/day</span>
                                <Badge variant="secondary" className="text-xs">
                                  {listing.category}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <Button size="sm" variant="outline" className="flex-1">
                                  <MessageCircle className="h-3 w-3 mr-1" />
                                  Contact
                                </Button>
                                <Button size="sm" variant="outline" className="flex-1">
                                  <Heart className="h-3 w-3 mr-1" />
                                  Remove
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Payments Coming Soon</h3>
                  <p className="text-muted-foreground mb-4">
                    We're working on integrating Razorpay for secure payments
                  </p>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• Secure payment processing</p>
                    <p>• Multiple payment methods</p>
                    <p>• Transaction history</p>
                    <p>• Refund management</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    Account Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start glass-effect">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile Information
                  </Button>
                  <Button variant="outline" className="w-full justify-start glass-effect">
                    <Camera className="h-4 w-4 mr-2" />
                    Change Profile Picture
                  </Button>
                  <Button variant="outline" className="w-full justify-start glass-effect">
                    <Settings className="h-4 w-4 mr-2" />
                    Privacy Settings
                  </Button>
                  <Button variant="outline" className="w-full justify-start glass-effect">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Payment Methods
                  </Button>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <LogOut className="h-5 w-5 mr-2" />
                    Account Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start glass-effect">
                    <Settings className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                  <Button variant="outline" className="w-full justify-start glass-effect">
                    <User className="h-4 w-4 mr-2" />
                    Download Data
                  </Button>
                  <Button variant="outline" className="w-full justify-start glass-effect text-destructive">
                    <X className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start glass-effect text-destructive"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
