const express = require('express');
const bodyParser = require('body-parser');
const winston = require('winston');

const app = express();
app.use(bodyParser.json());
winston.configure({
  transports: [
    new winston.transports.File({ filename: '../logfile.log' })
  ]
});

const port = process.env.PORT || 2500;
app.listen(port, () => winston.log('info', `Listening to ${port}`));


const getDurationInMilliseconds = (start) => {
  const NS_PER_SEC = 1e9;
  const NS_TO_MS = 1e6;
  const diff = process.hrtime(start);

  return (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS;
};


app.get('/api/home', (req, res) => {
  res.json({ message: 'Welcome to this awesome API' });
  const start = process.hrtime();
  const durationInMilliseconds = getDurationInMilliseconds(start);
  res.on('finish', () => winston.log(
    'info', `${req.method} ${req.url} ${res.statusCode} ${durationInMilliseconds.toLocaleString()} ms`
  ));
});

const covid19ImpactEstimator = (req, res) => {
  const data = req.body;
  const { region, reportedCases, timeToElapse } = data;

  const impact = {};
  const severeImpact = {};

  // currently affected people both for impact and severe impact
  impact.currentlyInfected = (reportedCases) * 10;
  severeImpact.currentlyInfected = (reportedCases) * 50;

  // infections by requested time computed for timeToElapse days
  const powerNumber = Math.trunc(timeToElapse / 3);
  const power = 2 ** powerNumber;
  impact.infectionsByRequestedTime = impact.currentlyInfected * power;
  severeImpact.infectionsByRequestedTime = severeImpact.currentlyInfected * power;

  // severe cases by request time that need hospitalization
  impact.severeCasesByRequestedTime = Math.trunc(
    impact.infectionsByRequestedTime * 0.15
  );
  severeImpact.severeCasesByRequestedTime = Math.trunc(
    severeImpact.infectionsByRequestedTime * 0.15
  );

  // number of beds available bassed on severe cases
  impact.hospitalBedsByRequestedTime = Math.trunc(
    (data.totalHospitalBeds * 0.35) - impact.severeCasesByRequestedTime
  );
  severeImpact.hospitalBedsByRequestedTime = Math.trunc(
    (data.totalHospitalBeds * 0.35) - severeImpact.severeCasesByRequestedTime
  );

  // of severe positive cases that will require ICU care.
  impact.casesForICUByRequestedTime = Math.trunc(
    impact.infectionsByRequestedTime * 0.05
  );
  severeImpact.casesForICUByRequestedTime = Math.trunc(
    severeImpact.infectionsByRequestedTime * 0.05
  );

  // severe positive cases that will require ventilators.
  impact.casesForVentilatorsByRequestedTime = Math.trunc(
    impact.infectionsByRequestedTime * 0.02
  );
  severeImpact.casesForVentilatorsByRequestedTime = Math.trunc(
    severeImpact.infectionsByRequestedTime * 0.02
  );

  // much money the economy is likely to lose daily,
  impact.dollarsInFlight = Math.trunc(
    (
      impact.infectionsByRequestedTime
      * region.avgDailyIncomePopulation
      * region.avgDailyIncomeInUSD) / data.timeToElapse
  );
  severeImpact.dollarsInFlight = Math.trunc(
    (
      severeImpact.infectionsByRequestedTime
      * region.avgDailyIncomePopulation
      * region.avgDailyIncomeInUSD) / timeToElapse
  );
  res.json({ data, estimate: { impact, severeImpact } });
  const start = process.hrtime();
  const durationInMilliseconds = getDurationInMilliseconds(start);
  res.on('finish', () => winston.log(
    'info', `${req.method} ${req.url} ${res.statusCode} ${durationInMilliseconds.toLocaleString()} ms`
  ));
};

app.post('/api/v1/on-covid-19', covid19ImpactEstimator);

// export default covid19ImpactEstimator;
