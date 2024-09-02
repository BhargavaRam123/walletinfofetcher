'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import BigNumber from 'bignumber.js';


const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

interface WalletInfo {
  balance: number;
  allTransactions: Array<{
    signature: string;
  }>;
}

const ALCHEMY_RPC_URL = 'https://solana-mainnet.g.alchemy.com/v2/t-r1pwyDboIWAnUCBeCl_nN97zB5TxYm';

export default function Home() {
  const [publicKey, setPublicKey] = useState<string>('');
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [mode, setMode] = useState<'connect' | 'paste'>('connect');
  const [amount, setAmount] = useState<string>('');
  const [recipient, setRecipient] = useState<string>('');

  const wallet = useWallet();
  const connection = new Connection(ALCHEMY_RPC_URL, 'confirmed');

  useEffect(() => {
    if (wallet.connected && wallet.publicKey) {
      handleFetchInfo(wallet.publicKey.toString());
    }
  }, [wallet.connected, wallet.publicKey]);

  const handleFetchInfo = async (key: string) => {
    setIsLoading(true);
    setError('');
    try {
      const pubKey = new PublicKey(key);

      // Fetch balance
      const balance = await connection.getBalance(pubKey);

      // Fetch transactions
      const transactions = await connection.getSignaturesForAddress(pubKey, { limit: 5 });

      setWalletInfo({
        balance: balance / 1e9, // Convert lamports to SOL
        allTransactions: transactions.map(tx => ({ signature: tx.signature }))
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

  const handleRefreshTransactions = () => {
    if (wallet.connected && wallet.publicKey) {
      handleFetchInfo(wallet.publicKey.toString());
    } else if (publicKey) {
      handleFetchInfo(publicKey);
    } else {
      setError("No wallet connected or public key provided");
    }
  };

  const handleSendPayment = async () => {
    if (!wallet.connected || !wallet.publicKey || !amount || !recipient) {
      setError("Please connect your wallet and enter an amount and recipient address");
      return;
    }

    
    try {
      const recipientPublicKey = new PublicKey(recipient);
      const amountInLamports = new BigNumber(amount).times(1e9).integerValue().toNumber();

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: recipientPublicKey,
          lamports: amountInLamports,
        })
      );

      const signature = await wallet.sendTransaction(transaction, connection);
      
      // Set a timeout for transaction confirmation
      const timeout = 60000; // 60 seconds
      const startTime = Date.now();

      while (Date.now() - startTime < timeout) {
        const confirmation = await connection.getSignatureStatus(signature);
        if (confirmation.value?.confirmationStatus === 'confirmed' || confirmation.value?.confirmationStatus === 'finalized') {
          
          handleFetchInfo(wallet.publicKey.toString()); 
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 2000)); 
      }

    } catch (error) {
      console.error('Error sending payment:', error);
      setError("Failed to send payment. Please try again.");
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
                <strong>Balance:</strong> {walletInfo.balance.toFixed(9)} SOL
              </p>
              <div className="flex justify-between items-center mt-4">
                <p className="text-sm font-mono text-gray-300">
                  <strong>Recent Transactions:</strong>
                </p>
                <button
                  onClick={handleRefreshTransactions}
                  className="px-3 py-1 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Refresh
                </button>
              </div>
              <ul className="list-disc list-inside text-gray-300 mt-2">
                {walletInfo.allTransactions.length > 0 ? (
                  walletInfo.allTransactions.map((txn, idx) => (
                    <li key={idx} className="truncate">{txn.signature}</li>
                  ))
                ) : (
                  <li>No transactions found.</li>
                )}
              </ul>
            </div>
          </div>
        )}

        {wallet.connected && (
          <div className="mt-8 bg-gray-800 p-6 rounded-2xl shadow-lg">
            <h3 className="text-lg font-mono text-gray-100 mb-4">Send SOL</h3>
            <div className="flex space-x-4 mb-4">
              <input
                type="number"
                placeholder="Amount in SOL"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-700 rounded-lg"
              />
              <input
                type="text"
                placeholder="Recipient address"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-700 rounded-lg"
              />
            </div>
            <div className="flex">
              <button
                onClick={handleSendPayment}
                className="w-full px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
              >
                Send Payment
              </button>
            </div>
          </div>
        )}

        <div className="mt-12 bg-gray-800 p-6 rounded-2xl shadow-lg">
          <h3 className="text-xl font-semibold mb-4">User Guide</h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>Connect your Solana wallet using the "Connect Wallet" button.</li>
            <li>Once connected, you can view your wallet balance and recent transactions.</li>
            <li>To send SOL, enter the amount and recipient's address in the "Send SOL" section.</li>
            <li>Click "Send Payment" to initiate the transaction.</li>
            <li>Your wallet balance will automatically update after the transaction.</li>
            <li>You can refresh your transaction history using the "Refresh" button.</li>
            <li>To view information for a different wallet, use the "Paste Public Key" option.</li>
          </ol>
        </div>
      </main>
    </div>
  );
}