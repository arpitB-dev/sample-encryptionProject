import "./App.css";
import axios from "axios";
import { ethers } from "ethers";
import lighthouse from "@lighthouse-web3/sdk";
import {useState,useEffect} from 'react'

function App() {

  const [uploadedData, setUploadedData] = useState(null);
  const [address, setAddress] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState(null);


  const sign_auth_message = async() =>{
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const publicKey = (await signer.getAddress()).toLowerCase();
    setAddress(publicKey)
    const messageRequested = await lighthouse.getAuthMessage(publicKey);
    const signed_message = await signer.signMessage(
      messageRequested
    );
    return(signed_message);
  }
  const sign_message = async () => {
  
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    const res = await axios.get(`https://api.lighthouse.storage/api/auth/get_message?publicKey=${address}`);
    const message = res.data;
    const signedMessage = await signer.signMessage(message);
    return({
      message: message,
      signedMessage: signedMessage,
      address: address
    });
  }
  const deployEncrypted = async (e) => {
    const signingResponse = await sign_message();
    const accessToken = (
      await axios.post(
        `https://api.lighthouse.storage/api/auth/verify_signer`,
        {
          publicKey: signingResponse.address,
          signedMessage: signingResponse.signedMessage,
        }
      )
    ).data.accessToken;


    const response = await lighthouse.uploadEncrypted(
      e,
      signingResponse.address,
      accessToken
    );

    setUploadedData(response);
    console.log(response);
  };
  const getAndDecrypt = async(item) =>{

    const cid = item?.cid;
    const signed_message = await sign_auth_message();
    const key = await lighthouse.fetchEncryptionKey(
      cid,
      address,
      signed_message
    );
    const decrypted = await lighthouse.decryptFile(cid, key, item?.mimeType);
    var url = window.URL.createObjectURL(decrypted, { oneTimeOnly: true });
    window.open(url,'_blank')
  }

  useEffect(() => {

    (async () => {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
      const address = await signer.getAddress();
      console.log(address);
      setAddress(address);
      await getUploads(address);

    })()


  }, [])
  

  const getUploads = async (address)=>{
    let uploads = await axios.get(`https://api.lighthouse.storage/api/user/get_uploads?publicKey=${address}`);
    let files = uploads?.['data'];
    files = files.filter((item)=> item?.encryption)
    setUploadedFiles(files);
  }
  return (
    <div className="App">
      <div className="uploadContainer">
      <label>Encrypt and Upload File</label>
      <br/>
      <input onChange={(e) => deployEncrypted(e)} type="file" />
      {
        uploadedData &&   <div className="infoBox">
        <p>Uploaded File Details</p>
        <table>
          <tr>
            <td>File Name</td>
            <td>{uploadedData?.Name}</td>
          </tr>
          <tr>
            <td>CID</td>
            <td>{uploadedData?.Hash}</td>
          </tr>
        </table>

      </div>
      }
    
      </div>   
      <div className="decryptContainer">
      <label>Decrypt File</label>
      <br/>
      {/* <input disabled={true} ref={cidText} type="text" placeholder="Enter CID" />
      <button  onClick={()=>{getAndDecrypt()}}>Decrypt</button> */}

      {
        uploadedFiles &&  <table>

          {
            uploadedFiles.map((item)=>  <tr>
            <td>{item?.fileName}</td>
            <td onClick={()=>{getAndDecrypt(item)}}>{'view'}</td>
          </tr>)
          }
       
      </table>
      }
      
      </div>   
    </div>
  );
}

export default App;
