import React, { useState } from "react";
import videoLogo from "../assets/video-posting.png";
import {
  Button,
  Card,
  Label,
  FileInput,
  TextInput,
  Textarea,
  Progress,
  Alert,
} from "flowbite-react";
import axios from "axios";
import toast from "react-hot-toast";

function VideoUpload() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null); // New state for thumbnail
  const [meta, setMeta] = useState({
    title: "",
    description: "",
  });
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  function handleFileChange(event) {
    setSelectedFile(event.target.files[0]);
  }

  function handleThumbnailChange(event) {
    // New handler for thumbnail
    setThumbnailFile(event.target.files[0]);
  }

  function formFieldChange(event) {
    setMeta({
      ...meta,
      [event.target.name]: event.target.value,
    });
  }

  function handleForm(formEvent) {
    formEvent.preventDefault();
    if (!selectedFile) {
      alert("Select a video file!");
      return;
    }
    if (!thumbnailFile) {
      alert("Select a thumbnail file!");
      return;
    }
    //submit the file to server:
    saveVideoToServer(selectedFile, thumbnailFile, meta);
  }

  function resetForm() {
    setMeta({
      title: "",
      description: "",
    });
    setSelectedFile(null);
    setThumbnailFile(null); // Reset thumbnail state
    setUploading(false);
  }

  //submit file to server
  async function saveVideoToServer(video, thumbnail, videoMetaData) {
    setUploading(true);

    try {
      let formData = new FormData();
      formData.append("title", videoMetaData.title);
      formData.append("description", videoMetaData.description);
      formData.append("file", video);
      formData.append("thumbnail", thumbnail); // Append thumbnail

      let response = await axios.post(
        `http://localhost:8080/api/v1/videos`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setProgress(progress);
          },
        }
      );

      setProgress(0);
      setMessage("File uploaded " + response.data.videoId);
      setUploading(false);
      toast.success("File uploaded successfully !!");
      resetForm();
    } catch (error) {
      console.log(error);
      setMessage("Error in uploading File");
      setUploading(false);
      toast.error("File not uploaded !!");
    }
  }

  return (
    <div className="text-white">
      <Card className="flex flex-col items-center justify-center">
        <h1>Upload Videos</h1>

        <div>
          <form
            noValidate
            className=" flex flex-col space-y-6"
            onSubmit={handleForm}
          >
            <div>
              <div className="mb-2 block">
                <Label htmlFor="file-upload" value="Video Title" />
              </div>
              <TextInput
                value={meta.title}
                onChange={formFieldChange}
                name="title"
                placeholder="Enter title"
              />
            </div>

            <div className="max-w-md">
              <div className="mb-2 block">
                <Label htmlFor="comment" value="Video Description" />
              </div>
              <Textarea
                value={meta.description}
                onChange={formFieldChange}
                name="description"
                id="comment"
                placeholder="Write video description..."
                required
                rows={4}
              />
            </div>

            <div className="flex items-center space-x-5 justify-center">
              <div className="shrink-0">
                <img
                  className="h-16 w-16 object-cover"
                  src={videoLogo}
                  alt="Video logo"
                />
              </div>
              <label className="block">
                <span className="sr-only">Choose video file</span>
                <input
                  name="file"
                  onChange={handleFileChange}
                  type="file"
                  accept="video/*"
                  className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-violet-50 file:text-violet-700
                    hover:file:bg-violet-100"
                />
              </label>
            </div>

            {/* Thumbnail Upload */}
            <div className="max-w-md">
              <div className="mb-2 block">
                <Label htmlFor="thumbnail-upload" value="Video Thumbnail" />
              </div>
              <FileInput
                id="thumbnail-upload"
                name="thumbnail"
                onChange={handleThumbnailChange}
                accept="image/*"
                helperText="Upload a thumbnail for your video (PNG, JPG, etc.)"
              />
            </div>

            <div className="">
              {uploading && (
                <Progress
                  color="green"
                  progress={progress}
                  textLabel="Uploading"
                  size={"lg"}
                  labelProgress
                  labelText
                />
              )}
            </div>

            <div className="">
              {message && (
                <Alert
                  color={"success"}
                  rounded
                  withBorderAccent
                  onDismiss={() => {
                    setMessage("");
                  }}
                >
                  <span className="font-medium">Success alert! </span>
                  {message}
                </Alert>
              )}
            </div>

            <div className="flex justify-center">
              <Button disabled={uploading} type="submit">
                Submit
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}

export default VideoUpload;

