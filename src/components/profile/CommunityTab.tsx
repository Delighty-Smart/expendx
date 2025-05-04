
import { useState } from "react";
import { Trophy, Map, Users, Award, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LeaderboardSection from "./LeaderboardSection";

const CommunityTab = ({ profile }: { profile: any }) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Community Leaderboards
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              Connect with others and see how your streak compares
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 bg-muted/40 rounded-lg">
            <h3 className="text-sm font-medium flex items-center gap-1 mb-2">
              <Trophy className="h-4 w-4 text-amber-500" /> 
              How the leaderboard works:
            </h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
              <li>Log in daily to build your streak</li>
              <li>Add transactions to maintain your streak</li>
              <li>Longer streaks earn you special titles</li>
              <li>Compare your progress with others globally or locally</li>
            </ul>
          </div>
          
          <Tabs defaultValue="global" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="global" className="flex items-center gap-1">
                <Trophy className="h-4 w-4" />
                Global Leaderboard
              </TabsTrigger>
              <TabsTrigger value="local" className="flex items-center gap-1">
                <Map className="h-4 w-4" />
                Local Leaderboard
              </TabsTrigger>
            </TabsList>

            <TabsContent value="global">
              <LeaderboardSection type="global" />
            </TabsContent>

            <TabsContent value="local">
              <LeaderboardSection 
                type="local" 
                continent={profile?.continent}
                country={profile?.country}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default CommunityTab;
