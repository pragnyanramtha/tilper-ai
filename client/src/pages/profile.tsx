import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Save, Loader2, Brain, X, Sparkles } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile } from "@shared/schema";

export default function ProfilePage() {
  const { toast } = useToast();

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [experience, setExperience] = useState("");
  const [goals, setGoals] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("javascript");

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setAge(profile.age?.toString() || "");
      setExperience(profile.experience || "");
      setGoals(profile.goals || "");
      setPreferredLanguage(profile.preferredLanguage || "javascript");
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({ title: "Profile saved", description: "Your preferences have been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save profile.", variant: "destructive" });
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      name: name || undefined,
      age: age ? parseInt(age) : undefined,
      experience: experience || undefined,
      goals: goals || undefined,
      preferredLanguage,
    });
  };

  const memories = (profile?.memories as string[]) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold" data-testid="text-profile-title">Profile & Settings</h1>
            <p className="text-sm text-muted-foreground">
              Help your AI mentor get to know you
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-xs font-medium">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="What should I call you?"
                  className="mt-1"
                  data-testid="input-profile-name"
                />
              </div>

              <div>
                <Label htmlFor="age" className="text-xs font-medium">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="Your age"
                  className="mt-1"
                  min={8}
                  max={99}
                  data-testid="input-profile-age"
                />
              </div>

              <div>
                <Label htmlFor="experience" className="text-xs font-medium">
                  Experience Level
                </Label>
                <Select value={experience} onValueChange={setExperience}>
                  <SelectTrigger className="mt-1" data-testid="select-experience">
                    <SelectValue placeholder="Select your experience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="complete_beginner">Complete Beginner</SelectItem>
                    <SelectItem value="some_basics">Know Some Basics</SelectItem>
                    <SelectItem value="comfortable">Comfortable with Basics</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="language" className="text-xs font-medium">
                  Preferred Language
                </Label>
                <Select value={preferredLanguage} onValueChange={setPreferredLanguage}>
                  <SelectTrigger className="mt-1" data-testid="select-language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                    <SelectItem value="python">Python</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="goals" className="text-xs font-medium">
                  Learning Goals
                </Label>
                <Textarea
                  id="goals"
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  placeholder="What do you want to learn? (e.g., 'Build games with JavaScript', 'Learn Python for data science')"
                  className="mt-1 resize-none"
                  rows={3}
                  data-testid="input-profile-goals"
                />
              </div>

              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="w-full"
                data-testid="button-save-profile"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Profile
              </Button>
            </div>
          </Card>

          {memories.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">AI Memories</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Things your AI mentor remembers about you
              </p>
              <div className="flex flex-wrap gap-1.5">
                {memories.map((memory, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="text-xs"
                    data-testid={`badge-memory-${i}`}
                  >
                    {memory}
                  </Badge>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
