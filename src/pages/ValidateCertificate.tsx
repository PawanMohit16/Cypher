import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { validateCertificate } from '@/services/certificateService';
import { Certificate } from '@/types/certificate';
import CertificatePreview from '@/components/CertificatePreview';
import { ArrowLeft, ExternalLink, Search, Shield, ShieldCheck, ShieldX } from 'lucide-react';
import { Link } from 'react-router-dom';
import MetaMaskButton from '@/components/MetaMaskButton';

const ValidateCertificate = () => {
  const { toast } = useToast();
  const [hash, setHash] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [validation, setValidation] = useState<{
    isValid: boolean;
    message: string;
    blockchainValid?: boolean;
  } | null>(null);
  const [isMetaMaskConnected, setIsMetaMaskConnected] = useState(false);

  const handleHashChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHash(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hash.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a certificate hash.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsValidating(true);
      const result = await validateCertificate(hash);
      setValidation({
        isValid: result.isValid,
        message: result.message,
        blockchainValid: result.blockchainValid
      });
      
      setCertificate(result.certificate || null);
      
      if (result.isValid) {
        toast({
          title: 'Certificate Validated',
          description: result.message,
        });
      } else {
        toast({
          title: 'Validation Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Validation Error',
        description: 'There was an error validating the certificate. Please try again.',
        variant: 'destructive',
      });
      setValidation(null);
      setCertificate(null);
    } finally {
      setIsValidating(false);
    }
  };

  // For demo purposes
  const sampleHash = 'QmfMcnU2nYp9zHmVMYJSeYysmwq55kCvpyMWybwQZqNScV';

  return (
    <Layout>
      <div className="animate-fade-in">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold gradient-text mb-2">
              Certificate Validation
            </h1>
            <p className="text-gray-600">
              Verify the authenticity of a certificate
            </p>
          </div>
          <MetaMaskButton onConnect={() => setIsMetaMaskConnected(true)} />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Validation Form */}
          <Card className="glass-card">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="hash" className="block text-sm font-medium text-gray-700">
                    Enter Certificate Hash
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <Input
                      type="text"
                      name="hash"
                      id="hash"
                      className="block w-full"
                      placeholder="e.g., QmfMcnU2nYp9zHmVMYJSeYysmwq55kCvpyMWybwQZqNScV"
                      value={hash}
                      onChange={handleHashChange}
                    />
                    <Button
                      type="submit"
                      className="ml-2 flex-shrink-0 bg-blue-gradient hover:opacity-90"
                      disabled={isValidating}
                    >
                      {isValidating ? (
                        <span className="flex items-center">
                          <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                          Verifying...
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <Search className="h-4 w-4 mr-2" />
                          Validate
                        </span>
                      )}
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    For demo, use: <button type="button" className="text-cypher-primary hover:underline" onClick={() => setHash(sampleHash)}>{sampleHash}</button>
                  </p>
                </div>
              </form>

              {validation && (
                <div className={`mt-6 p-4 rounded-md ${validation.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex">
                    <div className="flex-shrink-0">
                      {validation.isValid ? (
                        <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="ml-3">
                      <h3 className={`text-sm font-medium ${validation.isValid ? 'text-green-800' : 'text-red-800'}`}>
                        {validation.isValid ? 'Verification Successful' : 'Verification Failed'}
                      </h3>
                      <div className={`mt-2 text-sm ${validation.isValid ? 'text-green-700' : 'text-red-700'}`}>
                        <p>{validation.message}</p>
                      </div>
                      
                      {validation.isValid && certificate && (
                        <div className="mt-4">
                          <div className="flex items-center mb-2">
                            <h4 className="text-sm font-medium text-gray-700">Blockchain Verification:</h4>
                            <div className="ml-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                <ShieldCheck className="w-3 h-3 mr-1" /> Verified
                              </span>
                            </div>
                          </div>
                          
                          <h4 className="text-sm font-medium text-gray-700">Certificate Details:</h4>
                          <ul className="mt-1 text-sm text-gray-600 space-y-1">
                            <li><span className="font-medium">Recipient:</span> {certificate.firstName} {certificate.lastName}</li>
                            <li><span className="font-medium">Certification:</span> {certificate.certifiedFor}</li>
                            <li><span className="font-medium">Issued On:</span> {new Date(certificate.issuedOn).toLocaleDateString()}</li>
                            <li><span className="font-medium">Organization:</span> {certificate.organization}</li>
                            <li>
                              <span className="font-medium">IPFS Link:</span>
                              <a 
                                href={`https://gateway.pinata.cloud/ipfs/${certificate.ipfsHash.replace('ipfs://', '')}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="ml-1 text-cypher-primary hover:underline flex items-center"
                              >
                                View on IPFS <ExternalLink className="h-3 w-3 ml-1" />
                              </a>
                            </li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6">
                <Link to="/dashboard" className="inline-flex items-center text-sm text-cypher-primary hover:underline">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Dashboard
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Certificate Preview */}
          <div className="flex flex-col">
            <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden h-full">
              {certificate ? (
                <CertificatePreview certificate={certificate} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="text-gray-400 mb-4">
                    <Search className="h-16 w-16 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Certificate Loaded</h3>
                  <p className="text-gray-500 max-w-xs">
                    Enter a valid certificate hash to view and validate the certificate
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ValidateCertificate;
