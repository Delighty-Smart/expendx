
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import UserSearch from "./UserSearch";
import Leaderboard from "./Leaderboard";

const CommunityTab = () => {
  const [communityTab, setCommunityTab] = useState("search");

  return (
    <div>
      <Tabs value={communityTab} onValueChange={setCommunityTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="search">Search Users</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboards</TabsTrigger>
        </TabsList>
        
        <TabsContent value="search" className="mt-0">
          <UserSearch />
        </TabsContent>
        
        <TabsContent value="leaderboard" className="mt-0">
          <Leaderboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CommunityTab;
