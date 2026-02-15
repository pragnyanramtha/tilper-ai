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
import {
  Settings,
  Save,
  Loader2,
  Brain,
  User,
  Code2,
  GraduationCap,
  Sparkles,
  Trash2,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile, LearningPlan } from "@shared/schema";

export default function SettingsPage() {
  const { toast } = useToast();

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  const { data: plans } = useQuery<LearningPlan[]>({
    queryKey: ["/api/plans"],
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
      toast({ title: "Saved", description: "Your settings have been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
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
  const activePlans = (plans || []).filter(p => p.status === "active");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-xl font-bold" data-testid="text-settings-title">Settings</h1>
        </div>

        <div className="space-y-8">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Profile</h2>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="text-xs font-medium">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="What should I call you?"
                    className="mt-1"
                    data-testid="input-settings-name"
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
                    data-testid="input-settings-age"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="experience" className="text-xs font-medium">Experience Level</Label>
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
                  <Label htmlFor="language" className="text-xs font-medium">Preferred Language</Label>
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
              </div>

              <div>
                <Label htmlFor="goals" className="text-xs font-medium">Learning Goals</Label>
                <Textarea
                  id="goals"
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  placeholder="What do you want to learn? (e.g., 'Build games with JavaScript', 'Learn Python for data science')"
                  className="mt-1 resize-none"
                  rows={3}
                  data-testid="input-settings-goals"
                />
              </div>

              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                data-testid="button-save-settings"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </section>

          {memories.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">AI Memories</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Things your AI mentor has learned about you from conversations
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
            </section>
          )}

          {activePlans.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <GraduationCap className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Learning Plans</h2>
              </div>
              <div className="space-y-3">
                {activePlans.map((plan) => {
                  const topics = (plan.topics as any[]) || [];
                  const completed = topics.filter(t => t.status === "completed").length;
                  return (
                    <Card key={plan.id} className="p-4" data-testid={`card-plan-${plan.id}`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-medium text-sm">{plan.title}</h3>
                        <Badge variant="secondary" className="text-xs">{completed}/{topics.length}</Badge>
                      </div>
                      {plan.description && (
                        <p className="text-xs text-muted-foreground">{plan.description}</p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {topics.map((t: any, idx: number) => (
                          <Badge
                            key={idx}
                            variant={t.status === "completed" ? "default" : "outline"}
                            className="text-xs"
                          >
                            {t.title}
                          </Badge>
                        ))}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">About</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Tilper AI is an interactive coding platform that helps you learn programming through
              personalized AI mentoring, hands-on challenges, and visual explanations.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
