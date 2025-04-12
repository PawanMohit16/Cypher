
import React from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { getUserCertificates } from '@/services/certificateService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Download, ExternalLink, FileCheck, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const userCertificates = user ? getUserCertificates(user.id) : [];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
      description: 'The IPFS hash has been copied to your clipboard.',
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  if (!user) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold">User not found</h2>
          <p className="mt-2 text-gray-600">Please log in to view your profile.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="animate-fade-in">
        <header className="mb-8">
          <h1 className="text-3xl font-bold gradient-text mb-2">
            My Profile
          </h1>
          <p className="text-gray-600">
            Manage your account and certificates
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Info */}
          <div className="lg:col-span-1">
            <Card className="glass-card mb-6">
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className="h-16 w-16 rounded-full bg-blue-gradient flex items-center justify-center text-white text-xl font-bold">
                  {getInitials(user.fullName)}
                </div>
                <div>
                  <CardTitle className="text-xl">{user.fullName}</CardTitle>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border-t border-gray-200 pt-4 mt-2">
                  <dl className="divide-y divide-gray-200">
                    <div className="py-3 flex justify-between">
                      <dt className="text-sm font-medium text-gray-500">Role</dt>
                      <dd className="text-sm text-gray-900 capitalize">{user.userType}</dd>
                    </div>
                    <div className="py-3 flex justify-between">
                      <dt className="text-sm font-medium text-gray-500">Certificates</dt>
                      <dd className="text-sm text-gray-900">{userCertificates.length}</dd>
                    </div>
                  </dl>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Account Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button className="w-full justify-start" variant="outline">
                    Edit Profile
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    Change Password
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    Notification Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Certificates */}
          <div className="lg:col-span-2">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-xl">My Certificates</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="issued">
                  <TabsList className="mb-4">
                    <TabsTrigger value="issued">Issued Certificates</TabsTrigger>
                    <TabsTrigger value="received">Received Certificates</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="issued">
                    {userCertificates.length > 0 ? (
                      <div className="space-y-4">
                        {userCertificates.map((cert) => (
                          <Card key={cert.id} className="overflow-hidden">
                            <div className="h-1.5 bg-blue-gradient"></div>
                            <CardContent className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="md:col-span-3">
                                  <h3 className="text-lg font-medium">
                                    {cert.firstName} {cert.lastName}
                                  </h3>
                                  <p className="text-sm text-gray-500 mb-2">
                                    {cert.certifiedFor}
                                  </p>
                                  
                                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                    <span className="flex items-center">
                                      <Badge className="mr-1 bg-blue-100 text-blue-700 hover:bg-blue-100">
                                        {cert.organization}
                                      </Badge>
                                    </span>
                                    <span className="flex items-center">
                                      <Info className="h-4 w-4 mr-1" />
                                      Issued: {new Date(cert.issuedOn).toLocaleDateString()}
                                    </span>
                                    <span className="flex items-center">
                                      <FileCheck className="h-4 w-4 mr-1" />
                                      Status: <span className="text-green-600 ml-1">Valid</span>
                                    </span>
                                  </div>
                                  
                                  <div className="mt-3 flex items-center">
                                    <span className="text-xs text-gray-500 mr-1">IPFS:</span>
                                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{cert.ipfsHash}</code>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 ml-1"
                                            onClick={() => copyToClipboard(cert.ipfsHash)}
                                          >
                                            <Copy className="h-3 w-3" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Copy IPFS hash</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                </div>
                                
                                <div className="md:col-span-1 flex md:flex-col gap-2 md:gap-3 md:items-start items-center justify-end md:justify-center">
                                  <Link to={`/certificate/${cert.id}`}>
                                    <Button variant="outline" size="sm" className="w-full">
                                      View
                                    </Button>
                                  </Link>
                                  <Button variant="outline" size="sm" className="w-full">
                                    <Download className="h-3 w-3 mr-1" />
                                    PDF
                                  </Button>
                                  <Button variant="outline" size="sm" className="w-full">
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    IPFS
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <FileCheck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No certificates yet</h3>
                        <p className="text-gray-500 max-w-sm mx-auto mb-6">
                          You haven't issued any certificates yet. Start creating certificates to see them here.
                        </p>
                        <Link to="/generate">
                          <Button className="bg-blue-gradient hover:opacity-90">
                            Generate Certificate
                          </Button>
                        </Link>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="received">
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <FileCheck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No received certificates</h3>
                      <p className="text-gray-500 max-w-sm mx-auto">
                        You haven't received any certificates yet. Certificates issued to your email will appear here.
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
