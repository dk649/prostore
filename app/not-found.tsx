"use client";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";
import Image from "next/image";

const NotFoundPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Image
        src="/images/logo.svg"
        height={48}
        width={48}
        alt={APP_NAME}
        priority={true}
      />
      <div className="p-6 rounded-lg w-1/3 shadow-md text-center">
        <h1 className="text-3xl fount-bold mb-4">Page Not Found</h1>
        <p className="text-destructive">Could Not Find Requested Page</p>
        <Button
          variant="outline"
          className="mt-4 ml-2"
          onClick={() => (window.location.href = "/")}
        >
          Back
        </Button>
      </div>
    </div>
  );
};

export default NotFoundPage;
