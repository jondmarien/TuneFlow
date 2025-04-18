import React from "react";
import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";

interface YoutubeStatusBannerProps {
  youtubeConnected: boolean;
  loading?: boolean;
}

export const YoutubeStatusBanner: React.FC<YoutubeStatusBannerProps> = ({ youtubeConnected, loading }) => {
  return (
    <div className="flex items-center space-x-2">
      {/* YouTube Icon should be provided by parent if needed */}
      <span className="font-semibold text-red-600">YouTube</span>
      {youtubeConnected ? (
        <span className="ml-1 text-xs px-2 py-0.5 rounded bg-[#f8d7da]" style={{ backgroundColor: '#f8d7da', color: '#f472b6', fontWeight: 600, border: '1px solid #fca5a5', minWidth: 90, display: 'inline-block', textAlign: 'center' }}>
          CONNECTED!
        </span>
      ) : (
        <Button variant="outline" size="sm" className="ml-2 border-red-500 text-red-600 hover:bg-red-50" onClick={() => signIn('google')} disabled={loading}>
          Connect
        </Button>
      )}
    </div>
  );
};
