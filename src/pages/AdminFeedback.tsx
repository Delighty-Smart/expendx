
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AdminFeedbackPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the main admin page with the feedback tab active
    navigate('/admin?tab=feedback', { replace: true });
  }, [navigate]);

  return null;
};

export default AdminFeedbackPage;
