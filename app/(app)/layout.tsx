"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import Image from "next/image";
import ErrorBoundary from "@/components/ErrorBoundary";

import {
  LogOutIcon,
  MenuIcon,
  LayoutDashboardIcon,
  UploadIcon,
  RefreshCwIcon,
  LibraryIcon,
  Sun,
  Moon
} from "lucide-react";

const sidebarItems = [
  { href: "/home", icon: LayoutDashboardIcon, label: "Home Page", id: "home-link" },
  { href: "/workspaces", icon: LibraryIcon, label: "Workspaces", id: "workspaces-link" }, // Changed href and label
  { href: "/media-converter", icon: RefreshCwIcon, label: "Media Converter", id: "media-converter-link" },
  { href: "/video-upload", icon: UploadIcon, label: "Video Upload", id: "upload-button" },
];

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [theme, setTheme] = useState('dark');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };


  const handleLogoClick = () => {
    router.push("/");
  };

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await signOut({ redirectUrl: "/sign-in" });
    } catch (error) {
      console.error("Sign out error:", error);
      setIsLoggingOut(false); // Reset on error
    }
  };

  return (
    <div className="drawer lg:drawer-open">
      <input
        id="sidebar-drawer"
        type="checkbox"
        className="drawer-toggle"
        checked={sidebarOpen}
        onChange={() => setSidebarOpen(!sidebarOpen)}
      />
      <div className="drawer-content flex flex-col">
        {/* Navbar */}
        <header className="w-full bg-base-200">
          <div className="navbar max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex-none lg:hidden">
              <label
                htmlFor="sidebar-drawer"
                className="btn btn-square btn-ghost drawer-button"
                aria-label="open sidebar"
              >
                <MenuIcon />
              </label>
            </div>
            <div className="flex-1">
              <Link href="/" onClick={handleLogoClick}>
                <div className="btn btn-ghost normal-case text-2xl font-bold tracking-tight cursor-pointer">
                  Cloudinary Showcase
                </div>
              </Link>
            </div>
            <div className="flex-none flex items-center space-x-4">
              <button onClick={toggleTheme} className="btn btn-ghost btn-circle" aria-label="Toggle theme">
                  {theme === 'dark' ? <Sun/> : <Moon/>}
              </button>
              {user && (
                <>
                  <div className="avatar">
                    <div className="w-8 h-8 rounded-full">
                      <Image
                        width={40}
                        height={40}
                        src={user.imageUrl}
                        alt={
                          user.username || user.emailAddresses[0].emailAddress
                        }
                      />
                    </div>
                  </div>
                  <span className="text-sm truncate max-w-xs lg:max-w-md hidden md:block">
                    {user.username || user.emailAddresses[0].emailAddress}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className={`btn btn-ghost btn-circle ${isLoggingOut ? "loading" : ""}`}
                    disabled={isLoggingOut}
                    aria-label="Sign out"
                  >
                    {!isLoggingOut && <LogOutIcon className="h-6 w-6" />}
                  </button>
                </>
              )}
            </div>
          </div>
        </header>
        {/* Page content */}
        <main className="flex-grow">
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 my-8">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>
      <div className="drawer-side">
        <label htmlFor="sidebar-drawer" className="drawer-overlay"></label>
        <aside className="bg-base-200 w-64 h-full flex flex-col">
          <div className="flex items-center justify-center py-4">
            <RefreshCwIcon className="w-10 h-10 text-primary" />
          </div>
          <ul className="menu p-4 w-full text-base-content flex-grow">
            {sidebarItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  id={item.id}
                  className={`flex items-center space-x-4 px-4 py-2 rounded-lg ${
                    pathname === item.href
                      ? "bg-primary text-white"
                      : "hover:bg-base-300"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="w-6 h-6" />
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          {user && (
            <div className="p-4">
              <button
                onClick={handleSignOut}
                className={`btn btn-outline btn-error w-full ${isLoggingOut ? "loading" : ""}`}
                disabled={isLoggingOut}
              >
                {!isLoggingOut && <LogOutIcon className="mr-2 h-5 w-5" />}
                {isLoggingOut ? 'Logging out...' : 'Sign Out'}
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
