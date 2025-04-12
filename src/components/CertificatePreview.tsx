import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Certificate, CertificateData } from '@/types/certificate';
import { User } from '@/types/user';
import Logo from './Logo';
import { FileCheck } from 'lucide-react';
import { LayoutGrid } from 'lucide-react';

interface CertificatePreviewProps {
  certificate?: Certificate | null;
  preview?: CertificateData;
  user?: User | null;
}

const CertificatePreview: React.FC<CertificatePreviewProps> = ({
  certificate,
  preview,
  user,
}) => {
  // Use either the actual certificate or the preview data
  const data = certificate || preview;
  
  if (!data) {
    return (
      <Card className="glass-card h-full flex items-center justify-center">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <FileCheck className="w-12 h-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">Certificate Preview</h3>
          <p className="text-sm text-gray-500">
            Fill out the form to see a preview of your certificate here
          </p>
        </CardContent>
      </Card>
    );
  }

  // Get name from data
  const fullName = `${data.firstName} ${data.lastName}`;
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const assignedDate = data.assignedDate ? formatDate(data.assignedDate) : 'N/A';
  const issuedDate = certificate?.issuedOn ? formatDate(certificate.issuedOn) : assignedDate;

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-blue-gradient"></div>
      <CardContent className="p-8">
        <div className="max-w-2xl mx-auto border-4 border-blue-100 rounded-lg p-8 bg-white shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <Logo size="md" showText={true} />
            <div className="text-xs text-right text-gray-500">
              {certificate && (
                <div>Certificate ID: <span className="font-mono">{certificate.id.substring(0, 8)}...</span></div>
              )}
              {certificate?.ipfsHash && (
                <div>IPFS: <span className="font-mono">{certificate.ipfsHash.substring(0, 8)}...</span></div>
              )}
            </div>
          </div>
          
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold gradient-text uppercase tracking-wider">
              CERTIFICATE OF ACHIEVEMENT
            </h1>
            <div className="w-24 h-1 bg-blue-gradient mx-auto mt-2 rounded-full"></div>
          </div>
          
          <div className="text-center mb-8">
            <p className="text-gray-600 mb-4">This is to certify that</p>
            <h2 className="text-3xl font-bold mb-4">{fullName}</h2>
            <p className="text-gray-600 mb-6">has successfully completed the course in</p>
            <h3 className="text-2xl font-semibold text-cypher-primary mb-6">
              {data.certifiedFor}
            </h3>
            <p className="text-gray-600">
              Issued by <span className="font-semibold">{data.organization}</span> on {issuedDate}
            </p>
          </div>
          
          <div className="flex flex-col items-center mt-12">
            <div className="w-full flex justify-between items-center">
              <div className="flex-1 border-t-2 border-gray-200"></div>
              <div className="px-4 flex flex-col items-center gap-2">
                <img src="/image.png" alt="Hackindia" className="h-16" />
                <span className="font-bold text-lg">HACKINDIA</span>
              </div>
              <div className="flex-1 border-t-2 border-gray-200"></div>
            </div>
            <div className="flex justify-between w-full mt-4 text-sm text-gray-600">
              <div className="text-center flex-1">
                <div className="w-24 border-t border-gray-400 mx-auto"></div>
                <p className="mt-2">Issuer Signature</p>
              </div>
              <div className="text-center flex-1">
                <div className="w-24 border-t border-gray-400 mx-auto"></div>
                <p className="mt-2">Recipient Signature</p>
              </div>
            </div>
          </div>
          
          {certificate && (
            <div className="mt-6 pt-4 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-500">
                This certificate is blockchain-verified and can be validated using the IPFS hash.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CertificatePreview;
