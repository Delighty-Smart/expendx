
import Layout from "@/components/Layout";
import ProfileTabs from "@/components/profile/ProfileTabs";

const ProfilePage = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Profile</h1>
        <ProfileTabs />
      </div>
    </Layout>
  );
};

export default ProfilePage;
