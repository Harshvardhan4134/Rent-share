import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { createListing } from "@/lib/firestore";
import { uploadToCloudinary, uploadMultipleImages } from "@/lib/cloudinary";
import { auth } from "@/lib/firebase";
import { GeoPoint } from "firebase/firestore";
import { 
  Upload, 
  Plus, 
  X, 
  Calendar as CalendarIcon,
  MapPin,
  DollarSign,
  Tag,
  Image as ImageIcon,
  CheckCircle,
  Video,
  Loader2,
  Navigation
} from "lucide-react";

const PostItem = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    rentPerDay: "",
    location: "",
    lat: "",
    lng: "",
    swapAllowed: false,
    availability: null as Date | null,
    features: [] as string[],
    policies: [] as string[]
  });
  
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [newFeature, setNewFeature] = useState("");
  const [newPolicy, setNewPolicy] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const categories = [
    "Photography", "Sports & Outdoor", "Electronics", "Tools", 
    "Gaming", "Music", "Kitchen", "Furniture", "Books", "Clothing"
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      handleInputChange("features", [...formData.features, newFeature.trim()]);
      setNewFeature("");
    }
  };

  const removeFeature = (index: number) => {
    handleInputChange("features", formData.features.filter((_, i) => i !== index));
  };

  const addPolicy = () => {
    if (newPolicy.trim()) {
      handleInputChange("policies", [...formData.policies, newPolicy.trim()]);
      setNewPolicy("");
    }
  };

  const removePolicy = (index: number) => {
    handleInputChange("policies", formData.policies.filter((_, i) => i !== index));
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support geolocation",
        variant: "destructive"
      });
      return;
    }

    setGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        handleInputChange("lat", latitude.toString());
        handleInputChange("lng", longitude.toString());
        
        toast({
          title: "Location obtained",
          description: `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`
        });
        setGettingLocation(false);
      },
      (error) => {
        let errorMessage = "Failed to get location";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied by user";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out";
            break;
        }
        
        toast({
          title: "Location error",
          description: errorMessage,
          variant: "destructive"
        });
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setImages(prev => [...prev, ...files]);
      // Create preview URLs
      const newUrls = files.map(file => URL.createObjectURL(file));
      setImageUrls(prev => [...prev, ...newUrls]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
    }
  };

  const removeVideo = () => {
    setVideoFile(null);
    setVideoUrl("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!auth.currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to create a listing",
        variant: "destructive"
      });
      return;
    }

    if (images.length === 0) {
      toast({
        title: "Error",
        description: "Please upload at least one image",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      // Upload images to Cloudinary
      setUploading(true);
      const uploadedImageUrls = await uploadMultipleImages(images, 'rent-share/listings');
      
      // Upload video if provided
      let uploadedVideoUrl = "";
      if (videoFile) {
        const videoResult = await uploadToCloudinary(videoFile, 'rent-share/videos');
        uploadedVideoUrl = videoResult.secure_url;
      }

      // Create listing data
      const listingData = {
        ownerId: auth.currentUser.uid,
        title: formData.title,
        description: formData.description,
        rentPerDay: Number(formData.rentPerDay),
        swapAllowed: formData.swapAllowed,
        category: formData.category,
        location: new GeoPoint(Number(formData.lat), Number(formData.lng)),
        images: uploadedImageUrls,
        videoProof: uploadedVideoUrl,
        available: true
      };

      // Save to Firestore
      await createListing(listingData);

      toast({
        title: "Success",
        description: "Your listing has been created successfully!"
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating listing:', error);
      toast({
        title: "Error",
        description: "Failed to create listing. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-urbanist font-bold mb-4">
              List Your <span className="gradient-text">Item</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Share your items with the community and start earning
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Tag className="h-5 w-5 mr-2" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Item Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Canon EOS R5 Camera"
                      value={formData.title}
                      onChange={(e) => handleInputChange("title", e.target.value)}
                      className="glass-effect border-0"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select onValueChange={(value) => handleInputChange("category", value)}>
                      <SelectTrigger className="glass-effect border-0">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your item, its condition, and what's included..."
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    className="glass-effect border-0 min-h-[120px]"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="rentPerDay">Daily Rate (₹) *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="rentPerDay"
                        type="number"
                        placeholder="25"
                        value={formData.rentPerDay}
                        onChange={(e) => handleInputChange("rentPerDay", e.target.value)}
                        className="pl-10 glass-effect border-0"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="location">Location *</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="location"
                        placeholder="Downtown, City"
                        value={formData.location}
                        onChange={(e) => handleInputChange("location", e.target.value)}
                        className="pl-10 glass-effect border-0"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Location Coordinates</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={getCurrentLocation}
                      disabled={gettingLocation}
                      className="glass-effect"
                    >
                      {gettingLocation ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Navigation className="h-4 w-4 mr-2" />
                      )}
                      {gettingLocation ? "Getting Location..." : "Get Current Location"}
                    </Button>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="lat">Latitude *</Label>
                      <Input
                        id="lat"
                        type="number"
                        step="any"
                        placeholder="28.6139"
                        value={formData.lat}
                        onChange={(e) => handleInputChange("lat", e.target.value)}
                        className="glass-effect border-0"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="lng">Longitude *</Label>
                      <Input
                        id="lng"
                        type="number"
                        step="any"
                        placeholder="77.2090"
                        value={formData.lng}
                        onChange={(e) => handleInputChange("lng", e.target.value)}
                        className="glass-effect border-0"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <p>💡 Tip: Click "Get Current Location" to automatically fill in your coordinates, or enter them manually.</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="swapAllowed"
                    checked={formData.swapAllowed}
                    onCheckedChange={(checked) => handleInputChange("swapAllowed", checked)}
                  />
                  <Label htmlFor="swapAllowed">Allow swapping for this item</Label>
                </div>
              </CardContent>
            </Card>

            {/* Images */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ImageIcon className="h-5 w-5 mr-2" />
                  Photos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {imageUrls.map((imageUrl, index) => (
                    <div key={index} className="relative aspect-square">
                      <img 
                        src={imageUrl} 
                        alt={`Upload ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  
                  {images.length < 8 && (
                    <label className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:border-primary transition-colors glass-effect cursor-pointer">
                      <Upload className="h-6 w-6 mb-2" />
                      <span className="text-xs">Add Photo</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Add up to 8 photos. First photo will be the main image.
                </p>
              </CardContent>
            </Card>

            {/* Video Upload */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Video className="h-5 w-5 mr-2" />
                  360° Video Proof (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {videoUrl ? (
                  <div className="relative">
                    <video 
                      src={videoUrl} 
                      controls
                      className="w-full h-64 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={removeVideo}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <label className="block w-full h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:border-primary transition-colors cursor-pointer">
                    <Video className="h-8 w-8 mb-2" />
                    <span className="text-sm">Upload 360° Video Proof</span>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      className="hidden"
                    />
                  </label>
                )}
                <p className="text-sm text-muted-foreground">
                  Upload a 360° video to prove item authenticity and build trust.
                </p>
              </CardContent>
            </Card>

            {/* Features & Specs */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Features & Specifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., 45MP Full-Frame Sensor"
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    className="glass-effect border-0"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                  />
                  <Button type="button" onClick={addFeature} size="icon" variant="outline" className="glass-effect">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {formData.features.map((feature, index) => (
                    <Badge key={index} variant="secondary" className="glass-effect">
                      {feature}
                      <button
                        type="button"
                        onClick={() => removeFeature(index)}
                        className="ml-2 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Availability */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CalendarIcon className="h-5 w-5 mr-2" />
                  Availability
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Generally Available From</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal glass-effect border-0"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.availability ? (
                          formData.availability.toDateString()
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.availability}
                        onSelect={(date) => handleInputChange("availability", date)}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </CardContent>
            </Card>

            {/* Rental Policies */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Rental Policies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., No smoking around equipment"
                    value={newPolicy}
                    onChange={(e) => setNewPolicy(e.target.value)}
                    className="glass-effect border-0"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPolicy())}
                  />
                  <Button type="button" onClick={addPolicy} size="icon" variant="outline" className="glass-effect">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {formData.policies.map((policy, index) => (
                    <div key={index} className="flex items-center justify-between p-3 glass-effect rounded-lg">
                      <span className="text-sm">{policy}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removePolicy(index)}
                        className="h-8 w-8"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <CheckCircle className="h-12 w-12 text-primary mx-auto" />
                  <h3 className="font-semibold text-lg">Ready to List Your Item?</h3>
                  <p className="text-muted-foreground">
                    Your item will be reviewed and published within 24 hours
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button 
                      type="submit" 
                      size="lg"
                      disabled={submitting || uploading}
                      className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
                    >
                      {submitting || uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {uploading ? 'Uploading...' : 'Publishing...'}
                        </>
                      ) : (
                        'Publish Item'
                      )}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="lg" 
                      className="glass-effect"
                      disabled={submitting || uploading}
                    >
                      Save as Draft
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PostItem;