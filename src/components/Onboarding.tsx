
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface OnboardingSlide {
  title: string;
  description: string;
  imageSrc: string;
}

const slides: OnboardingSlide[] = [
  {
    title: "Budget Smarter",
    description: "Create personalized budgets and track your spending to achieve your financial goals.",
    imageSrc: "/lovable-uploads/ad58f423-0e4b-47c1-92f7-06748b137f97.png",
  },
  {
    title: "Track Expenses Easily",
    description: "Monitor all your expenses in one place and gain insights into your spending habits.",
    imageSrc: "/lovable-uploads/18a687fd-20c0-49bf-846b-d50f69fd7676.png",
  },
  {
    title: "Path to Financial Freedom",
    description: "Follow your financial journey and build habits that lead to long-term financial success.",
    imageSrc: "/lovable-uploads/ad58f423-0e4b-47c1-92f7-06748b137f97.png",
  },
];

export const Onboarding = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigate("/");
    }
  };

  const handleSkip = () => {
    navigate("/");
  };

  const handleBack = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <Card className="max-w-md w-full overflow-hidden rounded-xl shadow-lg">
        <div className="p-6 flex flex-col items-center">
          {/* Image */}
          <div className="mb-8 h-48 flex items-center justify-center">
            <img
              src={slides[currentSlide].imageSrc}
              alt={slides[currentSlide].title}
              className="max-h-full object-contain"
            />
          </div>

          {/* Content */}
          <h2 className="text-2xl font-bold text-center mb-2">{slides[currentSlide].title}</h2>
          <p className="text-center text-gray-600 mb-8">{slides[currentSlide].description}</p>

          {/* Progress Indicators */}
          <div className="flex justify-center space-x-2 mb-8">
            {slides.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full ${
                  index === currentSlide
                    ? "bg-primary w-6 transition-all duration-300"
                    : "bg-gray-300"
                }`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between w-full">
            {currentSlide > 0 ? (
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
            ) : (
              <Button variant="ghost" onClick={handleSkip}>
                Skip
              </Button>
            )}

            <Button 
              className="px-8 bg-gradient-to-r from-expendx-blue to-expendx-green text-white"
              onClick={handleNext}
            >
              {currentSlide === slides.length - 1 ? "Get Started" : "Next"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Onboarding;
