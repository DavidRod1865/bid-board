import React from "react";
import withPrideLogo from "../../assets/With Pride Logo.png";
import { useAuth0 } from "../../auth";

const LoginPage: React.FC = () => {
  const { loginWithRedirect, isLoading } = useAuth0();

  const handleAuth0Login = async () => {
    // Redirect to Auth0 hosted login page
    await loginWithRedirect();
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Login Form */}
      <div className="w-1/2 bg-white flex flex-col justify-center items-center px-12">
        <div className="max-w-md w-full space-y-8">
          {/* Logo */}
          <div className="text-center">
            <img
              src={withPrideLogo}
              alt="With Pride Logo"
              className="mx-auto h-16 w-auto mb-8"
            />
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome Back
            </h2>
            <p className="text-gray-600">Access the With Pride Bid Board</p>
          </div>

          {/* Login Form */}
          <div className="space-y-6">
            {/* Log In Button */}
            <button
              onClick={handleAuth0Login}
              disabled={isLoading}
              className="w-full bg-black text-white py-3 px-4 rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Loading..." : "Log In"}
            </button>

            {/* Terms */}
            <p className="text-xs text-gray-500 text-center">
              By continuing, you agree to With Pride's{" "}
              <a href="#" className="text-[#d4af37] hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-[#d4af37] hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - HVAC Background */}
      <div className="w-1/2 relative overflow-hidden">
        {/* Background Image */}
        <img
          src="https://withpridehvac.net/wp-content/uploads/2019/02/second-banner.jpg"
          alt="Background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Sophisticated overlay for optimal readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/60 to-black/75 backdrop-blur-[1px]"></div>

        {/* Main Content */}
        <div className="absolute inset-0 flex flex-col justify-center items-center text-white p-16 z-10">
          <div className="text-center space-y-12 max-w-lg">
            {/* With Pride Logo Circle */}
            <div className="mx-auto w-32 h-32 bg-gradient-to-br from-[#d4af37] to-[#b8941f] rounded-full flex items-center justify-center shadow-2xl border-4 border-white border-opacity-20 backdrop-blur-sm">
              <img
                src={withPrideLogo}
                alt="With Pride Logo"
                className="w-18 h-auto drop-shadow-md"
              />
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <h1 className="text-5xl font-bold tracking-tight drop-shadow-lg">
                  With Pride
                </h1>
                <h2 className="text-3xl font-semibold text-[#d4af37] tracking-wide">
                  Bid Board
                </h2>
              </div>
              <div className="space-y-4 mt-8">
                <p className="text-xl font-medium opacity-95 drop-shadow-sm">
                  Professional Bid Management
                </p>
                <p className="text-lg opacity-85 leading-relaxed max-w-md mx-auto">
                  Streamline bids, track vendors, and deliver excellence with
                  industry-leading tools
                </p>
              </div>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-4 justify-center mt-10">
              <span className="px-6 py-3 bg-gradient-to-r from-[#d4af37] to-[#e6c757] rounded-full text-sm font-bold text-black shadow-lg hover:shadow-xl transition-all duration-300 border border-[#d4af37]">
                Bid Tracking
              </span>
              <span className="px-6 py-3 bg-gradient-to-r from-[#d4af37] to-[#e6c757] rounded-full text-sm font-bold text-black shadow-lg hover:shadow-xl transition-all duration-300 border border-[#d4af37]">
                Vendor Management
              </span>
              <span className="px-6 py-3 bg-gradient-to-r from-[#d4af37] to-[#e6c757] rounded-full text-sm font-bold text-black shadow-lg hover:shadow-xl transition-all duration-300 border border-[#d4af37]">
                Reports & Analytics
              </span>
              <span className="px-6 py-3 bg-gradient-to-r from-[#d4af37] to-[#e6c757] rounded-full text-sm font-bold text-black shadow-lg hover:shadow-xl transition-all duration-300 border border-[#d4af37]">
                Project Notes
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Branding */}
        <div className="absolute bottom-8 left-8 text-white z-10">
          <div className="bg-gradient-to-r from-black/50 to-black/30 backdrop-blur-lg rounded-xl px-6 py-4 border border-white/20 shadow-2xl">
            <p className="text-base font-bold text-[#d4af37] tracking-wide">
              With Pride
            </p>
            <p className="text-sm opacity-90 font-medium tracking-wider">
              Excellence • Innovation • Trust
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
