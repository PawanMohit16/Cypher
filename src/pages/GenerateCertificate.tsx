
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { generateCertificate } from '@/services/certificateService';
import { useAuth } from '@/contexts/AuthContext';
import { CertificateData } from '@/types/certificate';
import CertificatePreview from '@/components/CertificatePreview';
import MetaMaskButton from '@/components/MetaMaskButton';
import TemplateSelector, { CertificateTemplate } from '@/components/templates/TemplateSelector';

const GenerateCertificate = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [certificate, setCertificate] = useState<any>(null);
  const [isMetaMaskConnected, setIsMetaMaskConnected] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplate>('classic');
  
  const [formData, setFormData] = useState<CertificateData>({
    firstName: '',
    lastName: '',
    organization: '',
    certifiedFor: '',
    assignedDate: new Date().toISOString().split('T')[0],
    duration: '1',
    recipientEmail: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: 'Authentication Error',
        description: 'You must be logged in to generate certificates.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!isMetaMaskConnected) {
      toast({
        title: 'MetaMask Required',
        description: 'Please connect to MetaMask to generate a certificate.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsGenerating(true);
      // Pass the selected template to the certificate generation service
      const generatedCertificate = await generateCertificate({...formData, templateType: selectedTemplate}, user);
      setCertificate(generatedCertificate);
      
      toast({
        title: 'Certificate Generated',
        description: 'Your certificate has been successfully generated and stored on the blockchain.',
      });
    } catch (error) {
      console.log(error)
      toast({
        title: 'Generation Failed',
        description: 'There was an error generating the certificate. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Layout>
      <div className="animate-fade-in">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold gradient-text mb-2">
              Certificate Generation
            </h1>
            <p className="text-gray-600">
              Create a new certificate backed by blockchain technology
            </p>
          </div>
          <MetaMaskButton onConnect={() => setIsMetaMaskConnected(true)} />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Certificate Form */}
          <Card className="glass-card order-2 lg:order-1">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Template Selection */}
                <div className="mb-6">
                  <TemplateSelector
                    selectedTemplate={selectedTemplate}
                    onSelectTemplate={setSelectedTemplate}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organization">Organization</Label>
                  <Input
                    id="organization"
                    name="organization"
                    placeholder="Cypher Academy"
                    value={formData.organization}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certifiedFor">Certified For</Label>
                  <Input
                    id="certifiedFor"
                    name="certifiedFor"
                    placeholder="Web Development"
                    value={formData.certifiedFor}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="assignedDate">Assigned Date</Label>
                    <Input
                      id="assignedDate"
                      name="assignedDate"
                      type="date"
                      value={formData.assignedDate}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (years)</Label>
                    <Input
                      id="duration"
                      name="duration"
                      type="number"
                      min="1"
                      placeholder="1"
                      value={formData.duration}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipientEmail">Recipient Email</Label>
                  <Input
                    id="recipientEmail"
                    name="recipientEmail"
                    type="email"
                    placeholder="recipient@example.com"
                    value={formData.recipientEmail}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-gradient hover:opacity-90"
                  disabled={isGenerating || !isMetaMaskConnected}
                >
                  {isGenerating ? (
                    <span className="flex items-center">
                      <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                      Generating...
                    </span>
                  ) : (
                    'Generate Certificate'
                  )}
                </Button>
                
                {!isMetaMaskConnected && (
                  <p className="text-sm text-amber-600 mt-2">
                    Connect MetaMask to generate certificates on the blockchain.
                  </p>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Certificate Preview */}
          <div className="order-1 lg:order-2">
            <CertificatePreview
              certificate={certificate}
              preview={!certificate ? formData : undefined}
              user={user}
              templateType={selectedTemplate}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default GenerateCertificate;
