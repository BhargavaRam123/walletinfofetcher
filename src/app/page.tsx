'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Connection, PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

interface WalletInfo {
  balance: number;
  recentTransactions: Array<{
    signature: string;
  }>;
}

export default function Home() {
  const [publicKey, setPublicKey] = useState<string>('');
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [mode, setMode] = useState<'connect' | 'paste'>('connect');

  const wallet = useWallet();

  useEffect(() => {
    if (wallet.connected && wallet.publicKey) {
      handleFetchInfo(wallet.publicKey.toString());
    }
  }, [wallet.connected, wallet.publicKey]);

  const handleFetchInfo = async (key: string) => {
    setIsLoading(true);
    setError('');
    try {
      const connection = new Connection('https://solana-mainnet.g.alchemy.com/v2/t-r1pwyDboIWAnUCBeCl_nN97zB5TxYm', 'confirmed');
      const pubKey = new PublicKey(key);

      const balance = await connection.getBalance(pubKey);
      const transactionSignatures = await connection.getSignaturesForAddress(pubKey, { limit: 5 });

      setWalletInfo({
        balance,
        recentTransactions: transactionSignatures.map(tx => ({ signature: tx.signature }))
      });
    } catch (error) {
      console.error('Error fetching wallet info:', error);
      setError("Failed to fetch wallet info. Please check the public key and try again.");
      setWalletInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (publicKey) {
      handleFetchInfo(publicKey);
    } else {
      setError("Please enter a public key");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100 font-sans">
      <header className="py-6 px-4 sm:px-6 lg:px-8 border-b border-gray-700">
        <nav className="flex justify-between items-center max-w-7xl mx-auto">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600"
          >
            sol.lens
          </motion.div>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-light mb-4">sol.lens Wallet Explorer</h1>
          <p className="text-lg font-light text-gray-400 mb-8">Analyze any Solana wallet with precision and ease.</p>
          <div className="max-w-md mx-auto">
            <div className="flex justify-center space-x-4 mb-4">
              <button
                onClick={() => setMode('connect')}
                className={`px-4 py-2 rounded-lg ${mode === 'connect' ? 'bg-blue-600' : 'bg-gray-600'}`}
              >
                Connect Wallet
              </button>
              <button
                onClick={() => setMode('paste')}
                className={`px-4 py-2 rounded-lg ${mode === 'paste' ? 'bg-blue-600' : 'bg-gray-600'}`}
              >
                Paste Public Key
              </button>
            </div>
            {mode === 'connect' ? (
              <div className="flex justify-center">
                <WalletMultiButton />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex items-center space-x-2">
                <input
                  type="text"
                  className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full py-3 px-4 sm:text-lg border-2 border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-400 shadow-md transition duration-300 ease-in-out"
                  placeholder="Enter Solana public key"
                  value={publicKey}
                  onChange={(e) => setPublicKey(e.target.value)}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-light rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {isLoading ? 'Analyzing...' : 'Analyze'}
                </motion.button>
              </form>
            )}
            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          </div>
        </motion.div>

        {walletInfo && (
          <div className="bg-gray-800 p-6 rounded-2xl shadow-lg">
            <h3 className="text-lg font-mono text-gray-100">Wallet Information</h3>
            <div className="mt-4">
              <p className="text-sm font-mono text-gray-300">
                <strong>Balance:</strong> {walletInfo.balance / 1e9} SOL
              </p>
              <p className="text-sm font-mono text-gray-300 mt-2">
                <strong>Recent Transactions:</strong>
              </p>
              <ul className="list-disc list-inside text-gray-300">
                {walletInfo.recentTransactions.map((txn, idx) => (
                  <li key={idx}>{txn.signature}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}