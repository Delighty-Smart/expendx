
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import UserProfileTab from "./UserProfileTab";
import CommunityTab from "./CommunityTab";

const ProfileTabs = () => {
  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="profile">Your Profile</TabsTrigger>
        <TabsTrigger value="community">Community</TabsTrigger>
      </TabsList>
      
      <TabsContent value="profile" className="mt-0">
        <UserProfileTab />
      </TabsContent>
      
      <TabsContent value="community" className="mt-0">
        <CommunityTab />
      </TabsContent>
    </Tabs>
  );
};

export default ProfileTabs;
