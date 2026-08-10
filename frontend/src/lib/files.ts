export function readEntry(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    return new Promise((resolve) => {
      (entry as FileSystemFileEntry).file((file) => resolve([file]))
    })
  }
  if (entry.isDirectory) {
    const dirReader = (entry as FileSystemDirectoryEntry).createReader()
    return new Promise((resolve) => {
      const allFiles: File[] = []
      const readBatch = () => {
        dirReader.readEntries(async (entries) => {
          if (entries.length === 0) {
            resolve(allFiles)
          } else {
            for (const e of entries) {
              const files = await readEntry(e)
              allFiles.push(...files)
            }
            readBatch()
          }
        })
      }
      readBatch()
    })
  }
  return Promise.resolve([])
}

export async function readDropItems(items: DataTransferItemList, fileList: FileList): Promise<File[]> {
  const allFiles: File[] = []
  const entries: FileSystemEntry[] = []

  for (let i = 0; i < items.length; i++) {
    const entry = items[i].webkitGetAsEntry?.()
    if (entry) entries.push(entry)
  }

  if (entries.length > 0) {
    for (const entry of entries) {
      const files = await readEntry(entry)
      allFiles.push(...files)
    }
  }

  if (allFiles.length === 0) {
    for (let i = 0; i < fileList.length; i++) {
      allFiles.push(fileList[i])
    }
  }

  return allFiles
}