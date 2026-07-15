import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, ShieldAlert, ArrowLeft, Smartphone, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

const DownloadPage = () => {
    const [apkDate, setApkDate] = useState<Date | null>(null);

    useEffect(() => {
        const fetchApkInfo = async () => {
            try {
                // Use a HEAD request to efficiently get the headers without downloading the file
                const response = await fetch('/expendx-latest.apk', { method: 'HEAD' });
                const lastModified = response.headers.get('Last-Modified');
                if (lastModified) {
                    setApkDate(new Date(lastModified));
                }
            } catch (error) {
                console.error("Failed to fetch APK info:", error);
            }
        };
        fetchApkInfo();
    }, []);

    const fadeUp = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } }
    };

    const steps = [
        {
            icon: <Download className="w-5 p-2 h-5 text-blue-400 bg-blue-400/10 rounded-lg" />,
            title: "1. Download the APK",
            description: "Click the download button below to start downloading the latest version of expendX."
        },
        {
            icon: <Smartphone className="w-5 p-2 h-5 text-emerald-400 bg-emerald-400/10 rounded-lg" />,
            title: "2. Open the File",
            description: "Once the download is complete, open the file from your downloads folder or notification bar."
        },
        {
            icon: <ShieldAlert className="w-5 p-2 h-5 text-amber-400 bg-amber-400/10 rounded-lg" />,
            title: "3. Bypass Play Protect",
            description: "Since this app is not on the Play Store yet, Android may show a 'Blocked by Play Protect' warning. To install, go to Play Store > Profile Icon > Play Protect > Settings (Gear Icon) > Turn off 'Scan apps with Play Protect'."
        },
        {
            icon: <CheckCircle2 className="w-5 p-2 h-5 text-green-400 bg-green-400/10 rounded-lg" />,
            title: "4. Complete Install",
            description: "Follow the remaining prompts to finish the installation and start using expendX!"
        }
    ];

    const copyDownloadLink = () => {
        const link = "https://expendx.vercel.app/expendx-latest.apk";
        navigator.clipboard.writeText(link);
        // Show a brief toast or alert if needed
    };

    return (
        <div className="min-h-screen bg-bg-base text-text-primary py-12 px-6 font-sans">
            <div className="container mx-auto max-w-2xl">
                <Link to="/" className="inline-flex items-center text-text-secondary hover:text-text-primary transition-colors mb-8 group">
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back to landing page
                </Link>

                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={fadeUp}
                    className="text-center mb-12"
                >
                    <div className="inline-block p-4 bg-primary/20 rounded-2xl mb-6">
                        <Smartphone className="w-12 h-12 text-primary" />
                    </div>
                    <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }} className="text-4xl font-bold mb-4">Install expendX for Android</h1>
                    <p className="text-text-secondary text-lg">
                        Experience smarter finance management directly on your mobile device.
                    </p>
                </motion.div>

                <div className="space-y-6 mb-12">
                    {steps.map((step, idx) => (
                        <motion.div
                            key={idx}
                            initial="hidden"
                            animate="visible"
                            variants={fadeUp}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6 flex items-start gap-4 hover:border-primary/20 transition-all duration-300"
                        >
                            <div className="flex-shrink-0 mt-1">
                                {step.icon}
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold mb-1">{step.title}</h3>
                                <p className="text-text-secondary text-sm leading-relaxed">
                                    {step.description}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={fadeUp}
                    transition={{ delay: 0.5 }}
                    className="text-center bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-8"
                >
                    <h3 className="text-xl font-semibold mb-2">Ready to download?</h3>
                    <p className="text-text-secondary text-sm mb-8">
                        The latest version includes the new Trends analysis and glassmorphism UI.
                    </p>
                    <div className="flex flex-col gap-4">
                        <a href="/expendx-latest.apk" download className="w-full">
                            <Button size="lg" className="rounded-full px-12 h-14 text-lg bg-white text-black hover:bg-white/90 w-full">
                                <Download className="w-5 h-5 mr-2" />
                                Download APK
                            </Button>
                        </a>
                        <Button
                            variant="outline"
                            size="lg"
                            className="rounded-full px-12 h-14 text-base border-white/20 bg-white/5 hover:bg-white/10 text-white"
                            onClick={copyDownloadLink}
                        >
                            Copy Download Link
                        </Button>
                    </div>
                    {apkDate && (
                        <p className="mt-6 text-sm text-emerald-400 font-medium">
                            Latest version updated {formatDistanceToNow(apkDate, { addSuffix: true })}
                        </p>
                    )}
                    <p className="mt-2 text-xs text-text-tertiary">
                        Requires Android 8.0 or higher.
                    </p>
                </motion.div>
            </div>
        </div>
    );
};

export default DownloadPage;
