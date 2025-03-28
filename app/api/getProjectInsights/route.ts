import { NextRequest, NextResponse } from 'next/server';
import { MetricServiceClient } from '@google-cloud/monitoring';
import { GoogleAuth } from 'google-auth-library';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import path from 'path';
import { firebaseConfig } from '@/database';

const serviceAccount = JSON.parse(process.env.NEXT_PUBLIC_SERVICE_ACCOUNT || '{}');

const auth = new GoogleAuth({
  credentials: serviceAccount,
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

const monitoringClient = new MetricServiceClient({
  auth,
  fallback: true,
  libName: 'gccl',
  libVersion: '1.0.0',
  projectId: serviceAccount.project_id,
  keyFilename: path.resolve(__dirname, 'config/serviceAccount.json'),
  protoPath: path.resolve(__dirname, 'node_modules/@google-cloud/monitoring/protos/protos.json'),
});

if (!getApps().length) {
  initializeApp(firebaseConfig);
}

const db = getFirestore();

export async function GET(req: NextRequest) {
  try {
    const projectId = serviceAccount.project_id;
    const projectName = `projects/${projectId}`;

    const readRequest = {
      name: projectName,
      filter: 'metric.type="firestore.googleapis.com/document/read_count" AND resource.type="firestore_instance"',
      interval: {
        startTime: {
          seconds: Math.floor(Date.now() / 1000) - 24 * 60 * 60,
        },
        endTime: {
          seconds: Math.floor(Date.now() / 1000),
        },
      },
      view: 'FULL' as const,
    };

    const activeConnectionsRequest = {
      name: projectName,
      filter: 'metric.type="firestore.googleapis.com/network/active_connections" AND resource.type="firestore_instance"',
      interval: {
        startTime: {
          seconds: Math.floor(Date.now() / 1000) - 24 * 60 * 60,
        },
        endTime: {
          seconds: Math.floor(Date.now() / 1000),
        },
      },
      view: 'FULL' as const,
    };

    console.log('Read Request:', JSON.stringify(readRequest, null, 2));
    console.log('Active Connections Request:', JSON.stringify(activeConnectionsRequest, null, 2));

    const [readResponse] = await monitoringClient.listTimeSeries(readRequest);
    const [activeConnectionsResponse] = await monitoringClient.listTimeSeries(activeConnectionsRequest);

    const readCount = readResponse.reduce((sum, series) => {
      return sum + (series.points?.reduce((pointSum, point) => pointSum + parseInt(String(point.value?.int64Value ?? '0')), 0) ?? 0);
    }, 0);

    const activeConnections = activeConnectionsResponse.reduce((sum, series) => {
      return sum + (series.points?.reduce((pointSum, point) => pointSum + parseInt(String(point.value?.int64Value ?? '0')), 0) ?? 0);
    }, 0);

    console.log('Number of Reads in the past 24 hours:', readCount);
    console.log('Active Connections:', activeConnections);
    
    return NextResponse.json({ reads: readCount, activeConnections }, { status: 200 });
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      console.error('Permission denied. Ensure the service account has the necessary Firestore permissions.');
    } else {
      console.error('Error fetching Firestore metrics:', error);
    }
    return NextResponse.json({ error: `Error fetching Firestore metrics: ${error.message}` }, { status: 500 });
  }
}