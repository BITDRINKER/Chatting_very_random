import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Telegram Bot Status</h1>
      
      <div className="grid gap-6 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Telegram Bots Active</CardTitle>
            <CardDescription>
              Your Telegram bots are running 
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-md border border-green-200">
                <h3 className="font-medium text-green-800">Main Bot Features:</h3>
                <ul className="list-disc pl-5 mt-2 text-green-700 space-y-1">
                  <li>Random chat pairing</li>
                  <li>Channel membership verification (@myanmar_leo_match and @projectx39)</li>
                  <li>User-friendly button interface</li>
                  <li>Leave chat without ending functionality</li>
                </ul>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
                <h3 className="font-medium text-blue-800">Admin Bot Features:</h3>
                <ul className="list-disc pl-5 mt-2 text-blue-700 space-y-1">
                  <li>Password protected (Adminisking)</li>
                  <li>Broadcast to channels with pin option</li>
                  <li>Broadcast to all bot users</li>
                  <li>Admin messages appear with "admin" label</li>
                </ul>
              </div>
            </div>
          </CardContent>
          <CardFooter className="text-sm text-gray-500 flex flex-col items-start space-y-2">
            <p>Use your Telegram app to interact with the bots.</p>
            <p>The web interface is for status display only.</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}