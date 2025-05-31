
import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getCertificateById } from '@/services/certificateService';
import { downloadCertificateAsPDF } from '@/utils/downloadUtils';
import { Certificate } from '@/types/certificate';
import { ArrowLeft, Copy, Download, ExternalLink, Info, QrCode } from 'lucide-react';
import CertificatePreview from '@/components/CertificatePreview';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const CertificateDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();
  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCertificate = async () => {
      if (id) {
        try {
          // Explicitly await the promise and ensure we're getting the resolved value
          const certResult = await getCertificateById(id);
          // Use the callback form of setState to avoid any confusion with promises
          setCertificate(() => certResult || null);
        } catch (error) {
          console.error('Error fetching certificate:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchCertificate();
  }, [id]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
      description: 'The IPFS hash has been copied to your clipboard.',
    });
  };

  const handleDownload = async () => {
    if (!certificate || !certificateRef.current) return;
    
    setDownloading(true);
    try {
      const success = await downloadCertificateAsPDF(certificateRef.current, certificate);
      if (success) {
        toast({
          title: 'Certificate Downloaded',
          description: 'Your certificate has been downloaded successfully.',
        });
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

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cypher-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!certificate) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold">Certificate not found</h2>
          <p className="mt-2 text-gray-600">The certificate you're looking for doesn't exist or has been removed.</p>
          <Link to="/dashboard">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  // Format dates
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Layout>
      <div className="animate-fade-in">
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link to="/profile" className="text-cypher-primary hover:underline inline-flex items-center">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Profile
            </Link>
            <h1 className="text-3xl font-bold gradient-text mt-2">
              Certificate Details
            </h1>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex items-center gap-1" 
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-current"></span>
                  <span className="hidden sm:inline">Downloading...</span>
                </span>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Download PDF</span>
                </>
              )}
            </Button>
            <Button className="bg-blue-gradient hover:opacity-90 flex items-center gap-1">
              <QrCode className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div ref={certificateRef}>
              <CertificatePreview 
                certificate={certificate} 
                templateType={certificate.templateType} 
              />
            </div>
          </div>

          <div className="lg:col-span-1">
            <Card className="glass-card mb-6">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-4">Certificate Information</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Recipient</h3>
                    <p className="mt-1">{certificate.firstName} {certificate.lastName}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Email</h3>
                    <p className="mt-1">{certificate.recipientEmail}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Certification</h3>
                    <p className="mt-1">{certificate.certifiedFor}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Organization</h3>
                    <p className="mt-1">{certificate.organization}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Issue Date</h3>
                    <p className="mt-1">{formatDate(certificate.issuedOn)}</p>
                  </div>
                  {certificate.expiresOn && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Expiry Date</h3>
                      <p className="mt-1">{formatDate(certificate.expiresOn)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-4">Blockchain Verification</h2>
                <div className="bg-gray-50 p-4 rounded-md mb-4">
                  <div className="flex items-center mb-2">
                    <h3 className="text-sm font-medium">IPFS Hash</h3>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 ml-1"
                            onClick={() => copyToClipboard(certificate.ipfsHash)}
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
                  <code className="text-xs block bg-white p-2 rounded border border-gray-200 break-all">
                    {certificate.ipfsHash}
                  </code>
                  <div className="flex justify-between mt-2">
                    <a 
                      href={`https://ipfs.io/ipfs/${certificate.ipfsHash}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-cypher-primary hover:underline flex items-center"
                    >
                      View on IPFS <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                    </svg>
                  </span>
                  <span>This certificate is verified and valid</span>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-medium mb-2">Verification Methods</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <Info className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-600">You can verify this certificate by entering the IPFS hash on the validation page.</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CertificateDetail;
