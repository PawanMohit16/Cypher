import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Layout from '@/components/Layout';
import { Award, CheckCircle, ChevronRight, Download, Eye, Copy, FileCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getUserCertificates } from '@/services/certificateService';
import { Certificate } from '@/types/certificate';
import { useToast } from '@/hooks/use-toast';
import CertificatePreview from '@/components/CertificatePreview';
import { downloadCertificateAsPDF } from '@/utils/downloadUtils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const certificatePreviewRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const fetchCertificates = async () => {
      if (user) {
        try {
          const userCerts = await getUserCertificates(user.id);
          
          // Log certificates to see if template types are present
          console.log('User certificates:', userCerts);
          
          // Ensure all certificates have a templateType
          const processedCerts = userCerts.map(cert => ({
            ...cert,
            templateType: cert.templateType || 'classic' // Default to classic if missing
          }));
          
          setCertificates(processedCerts);
        } catch (error) {
          console.error('Error fetching certificates: ', error);
          toast({
            title: 'Error',
            description: 'Failed to fetch certificates',
            variant: 'destructive',
          });
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchCertificates();
  }, [user]);

  const handleCopyHash = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      toast({
        title: 'Success',
        description: 'Certificate hash copied to clipboard!!!',
      });
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = hash;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast({
          title: 'Success',
          description: 'Certificate hash copied to clipboard!',
        });
      } catch (err) {
        toast({
          title: 'Error',
          description: 'Failed to copy hash',
          variant: 'destructive',
        });
      }
      document.body.removeChild(textArea);
    }
  };

  const handleView = (cert: Certificate) => {
    navigate(`/certificate/${cert.id}`);
  };

  const handleDownload = async (cert: Certificate) => {
    // First set the selected certificate and show the preview dialog
    setSelectedCertificate(cert);
    setShowPreviewDialog(true);
  };

  const downloadSelectedCertificate = async () => {
    if (!selectedCertificate || !certificatePreviewRef.current) return;
    
    setDownloading(true);
    try {
      const success = await downloadCertificateAsPDF(certificatePreviewRef.current, selectedCertificate);
      if (success) {
        toast({
          title: 'Certificate Downloaded',
          description: 'Your certificate has been downloaded successfully.',
        });
        // Close the dialog after successful download
        setShowPreviewDialog(false);
      } else {
        toast({
          title: 'Download Failed',
          description: 'There was an error downloading your certificate.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error downloading certificate:', error);
      toast({
        title: 'Download Failed',
        description: 'There was an error downloading your certificate.',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Layout>
      <div className="animate-fade-in">
        <header className="mb-8">
          <h1 className="text-3xl font-bold gradient-text mb-2">
            Welcome to Cypher
          </h1>
          <p className="text-gray-600">
            Your platform for secure certificate generation and validation
          </p>
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <Card 
            className="glass-card hover:shadow-lg transition duration-300 cursor-pointer"
            onClick={() => navigate('/generate')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xl font-bold">
                Certificate Generation
              </CardTitle>
              <Award className="h-8 w-8 text-cypher-primary" />
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm min-h-[60px]">
                Create secure, blockchain-backed certificates with custom fields, styling, and secure blockchain validation.
              </CardDescription>
              <div className="mt-6 flex justify-between items-center">
                <Badge className="bg-cypher-primary hover:bg-cypher-primary/90">Create</Badge>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="glass-card hover:shadow-lg transition duration-300 cursor-pointer"
            onClick={() => navigate('/validate')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xl font-bold">
                Certificate Validation
              </CardTitle>
              <FileCheck className="h-8 w-8 text-cypher-primary" />
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm min-h-[60px]">
                Verify the authenticity of certificates using our blockchain validation system.
              </CardDescription>
              <div className="mt-6 flex justify-between items-center">
                <Badge className="bg-cypher-primary hover:bg-cypher-primary/90">Validate</Badge>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Recent Certificates</h2>
            {certificates.length > 3 && (
              <Button
                variant="outline"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? 'Show Less' : 'Show All'}
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4">
            {loading ? (
              <Card className="glass-card p-6">
                <div className="animate-pulse flex space-x-4">
                  <div className="flex-1 space-y-4 py-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    </div>
                  </div>
                </div>
              </Card>
            ) : certificates.length > 0 ? (
              (showAll ? certificates : certificates.slice(0, 3)).map((cert) => (
                <Card 
                  key={cert.id} 
                  className={`glass-card ${cert.templateType === 'modern' ? 'border-l-4 border-blue-500' : cert.templateType === 'minimalist' ? 'border-l-4 border-gray-400' : ''}`}
                >
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold mb-1">{cert.firstName} {cert.lastName}</h3>
                        <p className="text-sm text-gray-600 mb-2">{cert.certifiedFor}</p>
                        <p className="text-xs text-gray-500">
                          Issued on: {new Date(cert.issuedOn).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {cert.organization}
                        </Badge>
                        {/* Template badge */}
                        {cert.templateType && cert.templateType !== 'classic' && (
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${cert.templateType === 'modern' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
                          >
                            {cert.templateType.charAt(0).toUpperCase() + cert.templateType.slice(1)}
                          </Badge>
                        )}
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyHash(cert.ipfsHash)}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy Hash
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(cert)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleView(cert)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="glass-card">
                <CardContent className="py-6 text-center text-gray-500">
                  No certificates generated yet
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {selectedCertificate && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div 
              className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full p-0 shadow-xl transform transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b p-4 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold">Certificate Preview</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Issued to {selectedCertificate.firstName} {selectedCertificate.lastName}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => setSelectedCertificate(null)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </Button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[80vh]">
                <CertificatePreview 
                  certificate={selectedCertificate} 
                  templateType={selectedCertificate.templateType || 'classic'}
                />
              </div>
              <div className="border-t p-4 flex justify-end space-x-2 bg-gray-50 dark:bg-gray-900">
                <Button
                  variant="outline"
                  onClick={() => setSelectedCertificate(null)}
                >
                  Close
                </Button>
                <Button
                  variant="default"
                  className="bg-blue-gradient hover:opacity-90"
                  onClick={() => handleCopyHash(selectedCertificate.ipfsHash)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Certificate Hash
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Certificate Preview Dialog for downloading */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>Certificate Preview</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowPreviewDialog(false)}
                className="h-8 w-8 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
            <DialogDescription>
              Review your certificate before downloading
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-4">
            <div ref={certificatePreviewRef} className="certificate-download-container">
              {selectedCertificate && (
                <CertificatePreview 
                  certificate={selectedCertificate} 
                  templateType={selectedCertificate.templateType} 
                />
              )}
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <Button 
              onClick={downloadSelectedCertificate}
              disabled={downloading}
              className="bg-blue-gradient hover:opacity-90"
            >
              {downloading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-current"></span>
                  Downloading...
                </span>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Dashboard;
