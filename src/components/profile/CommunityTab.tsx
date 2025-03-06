
import { useState } from "react";
import { Trophy, Map } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LeaderboardSection from "./LeaderboardSection";

const CommunityTab = ({ profile }: { profile: any }) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Community Leaderboards</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">
            Compare your streak and achievements with other users globally and in your region.
            Climb the ranks by maintaining your daily login streak!
          </p>
          
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
