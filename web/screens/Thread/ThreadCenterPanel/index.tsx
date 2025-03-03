/* eslint-disable @typescript-eslint/naming-convention */

import { useEffect, useState } from 'react'

import { Accept, useDropzone } from 'react-dropzone'

import { useAtomValue, useSetAtom } from 'jotai'

import { UploadCloudIcon } from 'lucide-react'

import { twMerge } from 'tailwind-merge'

import CenterPanelContainer from '@/containers/CenterPanelContainer'
import GenerateResponse from '@/containers/Loader/GenerateResponse'
import ModelStart from '@/containers/Loader/ModelStart'
import { fileUploadAtom } from '@/containers/Providers/Jotai'
import { snackbar } from '@/containers/Toast'

import useSendMessage from '@/hooks/useSendMessage'

import ChatBody from '@/screens/Thread/ThreadCenterPanel/ChatBody'

import ChatInput from './ChatInput'

import { experimentalFeatureEnabledAtom } from '@/helpers/atoms/AppConfig.atom'

import {
  isGeneratingResponseAtom,
  activeThreadAtom,
  isLoadingModelAtom,
} from '@/helpers/atoms/Thread.atom'

const renderError = (code: string) => {
  switch (code) {
    case 'multiple-upload':
      return 'Currently, we only support 1 attachment at the same time'

    case 'retrieval-off':
      return 'Turn on Retrieval in Assistant Settings to use this feature'

    case 'file-invalid-type':
      return 'We do not support this file type'

    default:
      return 'Oops, something error, please try again.'
  }
}

const ThreadCenterPanel: React.FC = () => {
  const { sendMessage, stopInference } = useSendMessage()
  const [dragRejected, setDragRejected] = useState({ code: '' })
  const setFileUpload = useSetAtom(fileUploadAtom)
  const experimentalFeature = useAtomValue(experimentalFeatureEnabledAtom)
  const activeThread = useAtomValue(activeThreadAtom)
  const isLoadingModel = useAtomValue(isLoadingModelAtom)
  const isVisionModel = false // activeThread?.assistants[0].model?.settings.vision_model

  const acceptedFormat: Accept = isVisionModel
    ? {
        'application/pdf': ['.pdf'],
        'image/jpeg': ['.jpeg'],
        'image/png': ['.png'],
        'image/jpg': ['.jpg'],
      }
    : {
        'application/pdf': ['.pdf'],
      }

  const { getRootProps, isDragReject } = useDropzone({
    noClick: true,
    multiple: false,
    accept: acceptedFormat,

    onDragOver: (e) => {
      // Retrieval file drag and drop is experimental feature
      if (!experimentalFeature) return
      if (
        e.dataTransfer.items.length === 1 &&
        ((activeThread?.assistants[0].tools &&
          activeThread?.assistants[0].tools[0]?.enabled) ||
          isVisionModel)
      ) {
        setDragOver(true)
      } else if (
        activeThread?.assistants[0].tools &&
        !activeThread?.assistants[0].tools[0]?.enabled
      ) {
        setDragRejected({ code: 'retrieval-off' })
      } else {
        setDragRejected({ code: 'multiple-upload' })
      }
    },
    onDragLeave: () => setDragOver(false),
    onDrop: (files, rejectFiles) => {
      // Retrieval file drag and drop is experimental feature
      if (!experimentalFeature) return
      if (
        !files ||
        files.length !== 1 ||
        rejectFiles.length !== 0 ||
        (activeThread?.assistants[0].tools &&
          !activeThread?.assistants[0].tools[0]?.enabled &&
          !isVisionModel)
      )
        return
      const imageType = files[0]?.type.includes('image')
      setFileUpload([{ file: files[0], type: imageType ? 'image' : 'pdf' }])
      setDragOver(false)
    },
    onDropRejected: (e) => {
      if (
        activeThread?.assistants[0].tools &&
        !activeThread?.assistants[0].tools[0]?.enabled
      ) {
        setDragRejected({ code: 'retrieval-off' })
      } else {
        setDragRejected({ code: e[0].errors[0].code })
      }
      setDragOver(false)
    },
  })

  useEffect(() => {
    if (dragRejected.code) {
      snackbar({
        description: renderError(dragRejected.code),
        type: 'error',
      })
    }
    setTimeout(() => {
      if (dragRejected.code) {
        setDragRejected({ code: '' })
      }
    }, 2000)
  }, [dragRejected.code])

  const [dragOver, setDragOver] = useState(false)

  const isGeneratingResponse = useAtomValue(isGeneratingResponseAtom)

  return (
    <CenterPanelContainer>
      <div
        className="relative flex h-full w-full flex-col outline-none"
        {...getRootProps()}
      >
        {dragOver && (
          <div className="absolute z-50 mx-auto h-full w-full p-8 backdrop-blur-lg">
            <div
              className={twMerge(
                'flex h-full w-full items-center justify-center rounded-lg border border-dashed border-[hsla(var(--primary-bg))]',
                isDragReject && 'border-[hsla(var(--destructive-bg))]'
              )}
            >
              <div className="mx-auto w-1/2 text-center">
                <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full">
                  <UploadCloudIcon
                    size={24}
                    className="text-[hsla(var(--primary-bg))]"
                  />
                </div>
                <div className="mt-4 text-[hsla(var(--primary-bg))]">
                  <h6 className="font-bold">
                    {isDragReject
                      ? `Currently, we only support 1 attachment at the same time with ${
                          isVisionModel ? 'PDF, JPEG, JPG, PNG' : 'PDF'
                        } format`
                      : 'Drop file here'}
                  </h6>
                  {!isDragReject && (
                    <p className="mt-2">
                      {isVisionModel ? 'PDF, JPEG, JPG, PNG' : 'PDF'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="flex h-full w-full flex-col justify-between">
          {activeThread && (
            <div className="flex h-full w-full overflow-x-hidden">
              <ChatBody />
            </div>
          )}

          {isGeneratingResponse && <GenerateResponse />}
          {isLoadingModel && <ModelStart />}

          {activeThread && (
            <ChatInput
              sendMessage={sendMessage}
              stopInference={stopInference}
            />
          )}
        </div>
      </div>
    </CenterPanelContainer>
  )
}

export default ThreadCenterPanel
