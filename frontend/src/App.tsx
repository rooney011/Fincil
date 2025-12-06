import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { UserProfile } from './types/database';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import { Loader } from 'lucide-react';

type AppState = 'loading' | 'auth' | 'onboarding' | 'dashboard';

function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setAppState('auth');
        return;
      }

      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData as UserProfile);
        setAppState('dashboard');
      } else {
        setAppState('onboarding');
      }
    } catch (error) {
      console.error('Session check error:', error);
      setAppState('auth');
    }
  };

  const handleAuth = () => {
    checkSession();
  };

  const handleProfileUpdate = (updatedProfile: UserProfile) => {
  setProfile(updatedProfile); // Updates the local state instantly
};

  const handleOnboardingComplete = (newProfile: UserProfile) => {
    setProfile(newProfile);
    setAppState('dashboard');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setAppState('auth');
  };

  if (appState === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-black animate-spin mx-auto mb-4" />
          <p className="text-gray-700">Initializing Financial Council...</p>
        </div>
      </div>
    );
  }

  if (appState === 'auth') {
    return <Auth onAuth={handleAuth} />;
  }

  if (appState === 'onboarding') {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  if (appState === 'dashboard' && profile) {
    return <Dashboard 
  profile={profile} 
  onLogout={handleLogout} 
  onProfileUpdate={handleProfileUpdate} // Pass this new prop
/>
  }

  return null;
}

export default App;
