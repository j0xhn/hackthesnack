/* eslint-disable jsx-a11y/accessible-emoji */
import React from "react";
import { BrowserRouter as Router, Route } from "react-router-dom";
import "./App.css";
import "./Shorthand.css";
import Vote from "./routes/vote";
import Landing from "./routes/landing";
import GlobalWrapper from "./stores/global";
import Toast from "./components/Toast";
import "semantic-ui-css/semantic.min.css";

function App() {
  return (
    <GlobalWrapper>
      <Toast>
        <Router>
          <Route path="/vote/:baseId/:location" component={Vote} />
          <Route exact path="/" component={Landing} />
          {/* <Route exact path="*" component={()=><div className='flex jcc mt20 fs3'>Page Not Found</div>} /> */}
        </Router>
      </Toast>
    </GlobalWrapper>
  );
}

export default App;
