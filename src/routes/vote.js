/* eslint-disable jsx-a11y/accessible-emoji */
import React, { useState, useContext, useEffect } from "react";
import { withRouter } from "react-router-dom";
import Airtable from "airtable";
import logo from "../static/images/logo.png";
import "../App.css";
import "../Shorthand.css";
import Slider from "@material-ui/core/Slider";
import offlineData from "../static/data/mappedSnackList";
import Typography from "@material-ui/core/Typography";
import terms from "../terms";
import Button from "@material-ui/core/Button";
import { chunk } from "lodash";
import { shuffle, mapAirtableValues, decimalIfExists } from "../utils";
import Thankyou from "../routes/thankyou";
import { ToastContext } from "../components";
import { useGlobalState } from "../stores/global";

function Vote({ match }) {
  const [snacks, setSnacks] = useState([]);
  const [{ user }, dispatch] = useGlobalState();
  const [allos, setAllos] = useState({});
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const toastContext = useContext(ToastContext);
  const votesPerSnack = 1;
  const defaultVotesPerSnack = 0;
  const totalBudget = snacks.length * votesPerSnack;

  useEffect(() => {
    const initBase = new Airtable({
      apiKey: process.env.REACT_APP_AIRTABLE_KEY
    }).base(match.params.baseId);
    initBase("config")
      .select({
        view: "Grid view"
      })
      .firstPage(function(err, records) {
        const values = mapAirtableValues(records);
        const set = values.reduce((acc, record) => {
          return { ...acc, [record.Name]: record.value };
        }, {});
        setConfig(set);
      });
  }, [match.params.baseId]);

  const handleSuccess = () => {
    const lastVoteTimestamp = Date.now();
    localStorage.setItem("hasa_lastVoteTimestamp", lastVoteTimestamp);
    localStorage.setItem("hasa_lastVoteVersion", config.version);
    dispatch({
      type: "user.update",
      payload: {
        lastVoteTimestamp,
        lastVoteVersion: config.version,
        voted: true
      }
    });
  };

  if (!snacks.length) {
    const base = new Airtable({
      apiKey: process.env.REACT_APP_AIRTABLE_KEY
    }).base(match.params.baseId);
    base("snacks")
      .select({
        view: "Grid view"
      })
      .firstPage(function(err, records) {
        const mappedData = err ? offlineData : mapAirtableValues(records);
        setSnacks(shuffle(mappedData));
        setLoading(false);
        setAllos(
          mappedData.reduce(
            (acc, snack) => ({
              ...acc,
              [snack.id]: defaultVotesPerSnack
            }),
            {}
          )
        );
      });
  }

  // CATEGORY
  const categories = snacks.reduce(
    (acc, snack) => ({
      ...acc,
      [snack.category]: (acc[snack.category] || []).concat(snack)
    }),
    {}
  );
  const categoryAllos = Object.entries(categories).reduce(
    (acc, [category, snacks]) => {
      const categoryTotal = snacks.reduce(
        (acc, snack) => acc + Number(allos[snack.id] || 0),
        0
      );
      return {
        ...acc,
        [category]: categoryTotal
      };
    },
    {}
  );
  const handleCategoryChange = ({ category, value }) => {
    // allo for current category
    const currentAllo = Number(categoryAllos[category]) || 0;
    const hypotheticalTotal = total - currentAllo + value;
    const isDecreasing = value < currentAllo;
    const isLessThanTotal = hypotheticalTotal <= totalBudget;
    if (isDecreasing || isLessThanTotal) {
      const snacksInCategory = categories[category];
      const spreadValue = (value - currentAllo) / snacksInCategory.length;
      const newAllos = snacksInCategory.reduce(
        (acc, snack) => ({
          ...acc,
          [snack.id]: allos[snack.id] + spreadValue
        }),
        {}
      );
      setAllos({
        ...allos,
        ...newAllos
      });
    }
  };
  // CATEGORY END

  const onSubmit = () => {
    const base = new Airtable({
      apiKey: process.env.REACT_APP_AIRTABLE_KEY
    }).base(match.params.baseId);
    base("votes").create(
      {
        uid: user.uid,
        meta: JSON.stringify({ version: config.version }),
        votes: JSON.stringify(allos)
      },
      function(err, record) {
        if (err) {
          toastContext.set({ message: err.toString() });
        } else {
          const snacksWithNewTotals = snacks.map(snack => ({
            id: snack.id,
            fields: {
              votes: (snack.votes || 0) + allos[snack.id]
            }
          }));
          chunk(snacksWithNewTotals, 10).forEach(chunk => {
            base("snacks").update(chunk);
          });
          handleSuccess();
        }
      }
    );
  };

  const total = Object.values(allos).reduce(
    (acc, allo) => Number(acc) + Number(allo),
    0
  );

  const showTerms = () => toastContext.set({ message: terms });
  const remainingBalance = decimalIfExists(totalBudget - total);
  if (loading) {
    return null;
  }
  const canVote = Boolean(user.lastVoteVersion !== config.version);
  return user.voted || !canVote ? (
    <Thankyou
      {...user}
      message={
        <div dangerouslySetInnerHTML={{ __html: config.thankYouText }} />
        // <JsxParser
        //   components={{ Highlight }}
        //   jsx={config.thankYouText || null}
        // />
      }
    />
  ) : (
    <div className="App tac">
      <div className="flex jcc aic column mt30">
        <img className="mb30 mr10" src={logo} width="200px" alt="logo" />
        <div className="mb50 flex aic column">
          <div className="fs14 w300 mb10">
            <div className="txtGray">
              <div dangerouslySetInnerHTML={{ __html: config.welcomeText }} />
              {/* <JsxParser
                  components={{ Highlight }}
                  jsx={config.welcomeText || null}
                /> */}
            </div>
          </div>
          <div>
            you have
            <span className="fs1 relative">{remainingBalance}</span>
            voice credits
            <div className="mb20"> to vote with on the following snacks </div>
          </div>
        </div>
      </div>
      <div className="flex aic column">
        {Object.entries(categories).map(([category, snacks]) => (
          <div key={category} className="w300 tal mb20">
            <Typography variant="h6">{category}</Typography>
            <Typography variant="body2" className="fs-10 txtGray">
              {snacks.map((snack, i) => `${i !== 0 ? "," : ""} ${snack.title}`)}
            </Typography>
            <Slider
              id={category}
              name={category}
              max={totalBudget}
              step={1}
              valueLabelDisplay="auto"
              value={decimalIfExists(categoryAllos[category] || 0)}
              onChange={(e, value) => handleCategoryChange({ category, value })}
              getAriaValueText={() => "input"}
            />
          </div>
        ))}
      </div>
      <div className="mt30 mb50 w100p">
        <Button variant="contained" color="primary" onClick={onSubmit}>
          Send Snack Feedback
        </Button>
      </div>
      <small className="fs10 w300 txtGray">
        Thanks for helping make Wayfair a great place to work and snack{" "}
      </small>
      <p className="mb20">🙇‍♂️</p>
      <div
        onClick={showTerms}
        className="fs10 w300 txtBlue pointer underline mb50"
      >
        terms and conditions
      </div>
    </div>
  );
}

export default withRouter(Vote);
