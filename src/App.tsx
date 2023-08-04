import React, { useEffect, useRef, useState } from "react";
import "./App.css";
import {
  TableContainer,
  Table,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Button,
  Snackbar,
  Alert,
  Link,
  Typography,
  Box,
  Divider
} from "@mui/material";
import {
  Scrypt,
  ScryptProvider,
  SensiletSigner,
  ContractCalledEvent,
  ByteString,
} from "scrypt-ts";
import { Voting } from "./contracts/voting";
import Footer from "./Footer";

// `npm run deploycontract` to get deployment transaction id
const contract_id = {
  /** The deployment transaction id */
  txId: "fd0a6b4a244212ec66e7e8c4d6360bb15a8d0696c07547487f7f4b06cc3897e1",
  /** The output index */
  outputIndex: 0,
};



function App() {
  const [votingContract, setContract] = useState<Voting>();
  const signerRef = useRef<SensiletSigner>();
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState<{
    txId: string;
    candidate: string;
  }>({
    txId: "",
    candidate: "",
  });

  async function fetchContract() {
    try {
      const instance = await Scrypt.contractApi.getLatestInstance(
        Voting,
        contract_id
      );
      setContract(instance);
    } catch (error: any) {
      console.error("fetchContract error: ", error);
      setError(error.message);
    }
  }

  useEffect(() => {
    const provider = new ScryptProvider();
    const signer = new SensiletSigner(provider);

    signerRef.current = signer;

    fetchContract();

    const subscription = Scrypt.contractApi.subscribe(
      {
        clazz: Voting,
        id: contract_id,
      },
      (event: ContractCalledEvent<Voting>) => {
        setSuccess({
          txId: event.tx.id,
          candidate: event.args[0] as ByteString,
        });
        setContract(event.nexts[0]);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleClose = (
    _event: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }
    setError("");
  };

  const handleSuccessClose = (
    _event: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }
    setSuccess({
      txId: "",
      candidate: "",
    });
  };

  async function voting(e: any) {
    handleSuccessClose(e);
    const signer = signerRef.current as SensiletSigner;

    if (votingContract && signer) {
      const { isAuthenticated, error } = await signer.requestAuth();
      if (!isAuthenticated) {
        throw new Error(error);
      }

      await votingContract.connect(signer);

      // create the next instance from the current
      const nextInstance = votingContract.next();

      const candidateName = e.target.name;

      // update state
      nextInstance.increaseVotesReceived(candidateName);

      // call the method of current instance to apply the updates on chain
      votingContract.methods
        .vote(candidateName, {
          next: {
            instance: nextInstance,
            balance: votingContract.balance,
          },
        })
        .then((result) => {
          console.log(`Voting call tx: ${result.tx.id}`);
        })
        .catch((e) => {
          setError(e.message);
          fetchContract();
          console.error("call error: ", e);
        });
    }
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>< img src={require("/public/logo.png")} alt="" /></h1>
      </header>
      <TableContainer
        component={Paper}
        variant="outlined"
        style={{ width: 1200, height: "101vh", margin: "auto" }}
      >
        <Table>
        <h2>Vote for your favourite NFT Artwork?</h2>
          
          <TableBody>
            <TableRow>
              <TableCell align="center">
                <Box>
                  <Box
                    sx={{
                      height: 500,
                    }}
                    component="img"
                    alt={"apple"}
                    src={`${process.env.PUBLIC_URL}/${"apple"}.png`}
                  />
                </Box>
              </TableCell>
              <TableCell align="center">
                <Box>
                  <Box
                    sx={{
                      height: 500,
                    }}
                    component="img"
                    alt={"watermelon"}
                    src={`${process.env.PUBLIC_URL}/${"watermelon"}.png`}
                  />
                </Box>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell align="center">
                <Box>
                  <Typography variant={"h1"} >
                    {votingContract?.candidates[0].votesReceived.toString()}
                  </Typography>
                  <Button
                    variant="text"
                    onClick={voting}
                    name={votingContract?.candidates[0].name}
                  >
                    👍
                  </Button>
                </Box>
              </TableCell>

              <TableCell align="center">
              <Divider orientation="vertical" flexItem />
                <Box>
                  <Typography variant={"h1"}>
                    {votingContract?.candidates[1].votesReceived.toString()}
                  </Typography>
                  <Button
                    variant="text"
                    onClick={voting}
                    name={votingContract?.candidates[1].name}
                  >
                    👍
                  </Button>
                </Box>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      <Footer />
      <Snackbar
        open={error !== ""}
        autoHideDuration={6000}
        onClose={handleClose}
      >
        <Alert severity="error">{error}</Alert>
      </Snackbar>

      <Snackbar
        open={success.candidate !== "" && success.txId !== ""}
        autoHideDuration={6000}
        onClose={handleSuccessClose}
      >
        <Alert severity="success">
          {" "}
          <Link
            href={`https://test.whatsonchain.com/tx/${success.txId}`}
            target="_blank"
            rel="noreferrer"
          >
            {`vote successful,  tx: ${
              success.txId
            }`}
          </Link>
        </Alert>
      </Snackbar>
    </div>
  );
}

export default App;
