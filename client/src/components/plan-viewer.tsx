
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, CheckCircle2, Circle, Clock, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppContext } from "@/lib/app-context";
import type { LearningPlan } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function PlanViewer() {
    const { activePlanId, setActivePlanId, setActiveChallengeId, setMode } = useAppContext();

    const { data: plan, isLoading } = useQuery<LearningPlan>({
        queryKey: ["/api/plans", activePlanId],
        enabled: !!activePlanId,
    });

    if (!activePlanId) return null;

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!plan) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4">
                <p className="text-muted-foreground">Plan not found</p>
                <Button variant="outline" onClick={() => setActivePlanId(null)}>
                    Go Back
                </Button>
            </div>
        );
    }

    const topics = (plan.topics as any[]) || [];

    const handleStartTopic = async (topic: any) => {
        // Generate a challenge for this topic
        try {
            const res = await apiRequest("POST", "/api/challenges/generate", {
                topic: topic.title,
                difficulty: topic.difficulty || "Beginner",
                language: topic.language || "javascript",
                planId: plan.id,
            });
            const challenge = await res.json();

            // Update plan topic status
            // Note: In a real app we'd update the topic status here via API

            setActivePlanId(null);
            setActiveChallengeId(challenge.id);
            setMode("learn");
        } catch (e) {
            console.error("Failed to start topic:", e);
        }
    };

    return (
        <div className="h-full flex flex-col max-w-4xl mx-auto w-full p-4 md:p-6">
            <div className="flex items-center gap-2 mb-6">
                <Button variant="ghost" size="icon" onClick={() => setActivePlanId(null)}>
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">{plan.title}</h1>
                    <p className="text-muted-foreground text-sm">{plan.description}</p>
                </div>
                <Badge variant={plan.status === "completed" ? "default" : "secondary"} className="ml-auto">
                    {plan.status}
                </Badge>
            </div>

            <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4 pb-8">
                    {topics.map((topic, index) => {
                        const isCompleted = topic.status === "completed";
                        const isNext = !isCompleted && (index === 0 || topics[index - 1].status === "completed");

                        return (
                            <Card key={index} className={`transition-all ${isNext ? "border-primary/50 shadow-md bg-primary/5" : "opacity-80 hover:opacity-100"}`}>
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center border ${isCompleted ? "bg-green-500/10 border-green-500 text-green-500" :
                                                    isNext ? "bg-primary/10 border-primary text-primary" : "border-muted-foreground/30 text-muted-foreground/30"
                                                }`}>
                                                {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                                                    isNext ? <Play className="w-3 h-3 ml-0.5" /> :
                                                        <span className="text-xs">{index + 1}</span>}
                                            </div>
                                            <div>
                                                <CardTitle className="text-base">{topic.title}</CardTitle>
                                                <CardDescription className="line-clamp-1">{topic.description}</CardDescription>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs capitalize">
                                                {topic.difficulty}
                                            </Badge>
                                            <Badge variant="outline" className="text-xs bg-muted/50">
                                                {topic.language}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardHeader>
                                {isNext && (
                                    <CardContent className="pt-2">
                                        <Button onClick={() => handleStartTopic(topic)} className="w-full sm:w-auto gap-2">
                                            <Play className="w-3.5 h-3.5" />
                                            Start Lesson
                                        </Button>
                                    </CardContent>
                                )}
                            </Card>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
}
