import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

const serviceAccount = JSON.parse(process.env.NEXT_PUBLIC_SERVICE_ACCOUNT || '{}');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});


export const saveDailyStatistics = onSchedule("every day 00:00", async (context) => {
  const db = admin.firestore();
  const now = new Date();
  const day = now.toLocaleDateString('en-GB').replace(/\//g, '-');
  
  const statisticsRef = db.collection('statistics').doc(day);
  
  const statistics = await fetchStatisticsData();
  
  await statisticsRef.set(statistics);
  logger.info(`Statistics for ${day} saved successfully.`);
});

async function fetchStatisticsData() {
  const modulesCount = await fetchProductModulesCount();
  const pageViews = await fetchProductPageViews();
  const combinedData = modulesCount.map((product) => {
    const pageViewData = pageViews.find((view: any) => view.slug === product.slug);
    return {
      ...product,
      pageViews: pageViewData ? pageViewData.eventCount : 0,
    };
  });
  const totalModules = combinedData.reduce((acc, product) => acc + product.modulesCount, 0);

  const response = await fetch('https://heimatinfo.web.app/api/getProjectInsights');
  const data = await response.json();
  if (data.error) {
    throw new Error(`Error fetching Firestore metrics: ${data.error}`);
  }

  return {
    productModulesCount: combinedData,
    totalModulesCount: totalModules,
    reads: data.reads,
  };
}

async function fetchProductModulesCount() {
  const querySnapshot = await admin.firestore().collection('product').get();
  const productModulesCount = await Promise.all(querySnapshot.docs.map(async (doc) => {
    const modulesSnapshot = await doc.ref.collection('modules').get();
    return {
      name: doc.data().name,
      slug: doc.data().slug,
      modulesCount: modulesSnapshot.size,
    };
  }));

  return productModulesCount;
}

async function fetchProductPageViews() {
  try {
    const response = await fetch('https://heimatinfo.web.app/api/getPageViews');
    const data = await response.json();
    if (data.error) {
      throw new Error(`Error fetching page views: ${data.error}`);
    }
    return data;
  } catch (error) {
    throw new Error(`Error fetching page views: ${error}`);
  }
}
